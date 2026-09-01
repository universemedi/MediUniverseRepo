package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.NotificationDto;
import com.MediUnivers.service.notification.ChannelSendResult;
import com.MediUnivers.service.notification.NotificationChannelSender;
import com.MediUnivers.service.repository.NotificationRepository;
import com.MediUnivers.service.repository.OrganizationCommunicationSettingsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The single Communication Engine every business module talks to (spec §1:
 * "Never send emails or SMS directly from Clinic, CRM, Pharmacy, Laboratory,
 * Billing, or Website modules — instead go through the Communication
 * Engine"). {@link #notify} is the one entry point: it looks up the org's
 * (editable) template for the event, renders it, and enqueues one row per
 * enabled channel. Nothing here ever talks to SMTP/SMS/WhatsApp directly —
 * that's {@link NotificationChannelSender}'s job — and nothing here blocks
 * the caller waiting for a network call: it only ever writes PENDING rows.
 * Actual delivery happens in {@link NotificationSchedulerService}, on its
 * own schedule, in its own transaction — "users never wait for emails to be
 * sent" (spec §14).
 */
@Service
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final OrganizationCommunicationSettingsRepository settingsRepository;
    private final NotificationTemplateService templateService;
    private final TemplateRenderService renderService;
    private final Map<NotificationChannel, NotificationChannelSender> senders;

    public NotificationService(NotificationRepository notificationRepository,
                                OrganizationCommunicationSettingsRepository settingsRepository,
                                NotificationTemplateService templateService,
                                TemplateRenderService renderService,
                                List<NotificationChannelSender> senderBeans) {
        this.notificationRepository = notificationRepository;
        this.settingsRepository = settingsRepository;
        this.templateService = templateService;
        this.renderService = renderService;
        this.senders = senderBeans.stream().collect(Collectors.toMap(NotificationChannelSender::channel, s -> s));
    }

    /**
     * Queue a notification for every channel this org has enabled AND has an
     * active template for, in the order Email → SMS → WhatsApp → In-App.
     * Safe to call from inside a business module's own @Transactional method —
     * this only ever INSERTs; it never calls out to a provider itself.
     */
    @Transactional
    public void notify(Organization organization, NotificationEventType eventType, NotificationRecipient recipient,
                        Map<String, String> variables) {
        notify(organization, eventType, recipient, variables, NotificationPriority.NORMAL, null, null, null);
    }

    @Transactional
    public void notify(Organization organization, NotificationEventType eventType, NotificationRecipient recipient,
                        Map<String, String> variables, NotificationPriority priority,
                        String referenceType, Long referenceId, Instant scheduledFor) {
        OrganizationCommunicationSettings settings = getOrCreateSettings(organization);

        for (NotificationChannel channel : NotificationChannel.values()) {
            if (!channelEnabled(settings, channel)) continue;
            if (channel == NotificationChannel.EMAIL && isBlank(recipient.email())) continue;
            if ((channel == NotificationChannel.SMS || channel == NotificationChannel.WHATSAPP) && isBlank(recipient.phone())) continue;

            templateService.find(organization, eventType, channel)
                    .filter(NotificationTemplate::isActive)
                    .ifPresent(template -> {
                        Notification n = new Notification();
                        n.setOrganization(organization);
                        n.setEventType(eventType);
                        n.setCategory(eventType.category());
                        n.setChannel(channel);
                        n.setPriority(priority != null ? priority : NotificationPriority.NORMAL);
                        n.setStatus(NotificationStatus.PENDING);
                        n.setRecipientName(recipient.name());
                        n.setRecipientEmail(recipient.email());
                        n.setRecipientPhone(recipient.phone());
                        n.setRecipientUserId(recipient.userId());
                        n.setSubject(template.getSubject() != null ? renderService.render(template.getSubject(), variables) : null);
                        n.setBody(renderService.render(template.getBody(), variables));
                        n.setReferenceType(referenceType);
                        n.setReferenceId(referenceId);
                        n.setScheduledFor(scheduledFor);
                        notificationRepository.save(n);
                    });
        }
    }

    private boolean channelEnabled(OrganizationCommunicationSettings settings, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> settings.isEmailEnabled();
            case SMS -> settings.isSmsEnabled();
            case WHATSAPP -> settings.isWhatsappEnabled();
            case IN_APP -> settings.isInAppEnabled();
        };
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    // ---------------- Dispatch (called only by the scheduler) ----------------

    /** Attempts delivery for one queued row and records the outcome. Runs in its own short transaction. */
    @Transactional
    public void dispatch(Long notificationId) {
        Notification n = notificationRepository.findById(notificationId).orElse(null);
        if (n == null) return;
        if (n.getStatus() != NotificationStatus.PENDING && n.getStatus() != NotificationStatus.QUEUED) return;

        n.setStatus(NotificationStatus.PROCESSING);
        NotificationChannelSender sender = senders.get(n.getChannel());
        if (sender == null) {
            n.setStatus(NotificationStatus.FAILED);
            n.setErrorMessage("No sender registered for channel " + n.getChannel());
            notificationRepository.save(n);
            return;
        }

        OrganizationCommunicationSettings settings = getOrCreateSettings(n.getOrganization());
        ChannelSendResult result;
        try {
            result = sender.send(settings, n);
        } catch (Exception ex) {
            result = ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "Unexpected delivery error.");
        }

        if (result.success()) {
            n.setStatus(NotificationStatus.SENT);
            n.setSentAt(Instant.now());
            n.setErrorMessage(null);
        } else {
            n.setRetryCount(n.getRetryCount() + 1);
            n.setErrorMessage(result.errorMessage());
            n.setStatus(NotificationStatus.FAILED);
            if (n.getRetryCount() >= n.getMaxRetries()) {
                n.setNextRetryAt(null); // exhausted — terminal, the retry sweep won't pick this up again
            } else {
                n.setNextRetryAt(Instant.now().plusSeconds(60L * (long) Math.pow(3, n.getRetryCount()))); // 1m, 3m, 9m...
            }
        }
        notificationRepository.save(n);
    }

    /** Re-arms a FAILED-but-not-exhausted row so the next retry sweep picks it up immediately. */
    @Transactional
    public void requeueForRetry(Notification n) {
        n.setStatus(NotificationStatus.QUEUED);
        n.setNextRetryAt(null);
        notificationRepository.save(n);
    }

    // ---------------- Ad-hoc test send (Communication Settings screen) ----------------

    /** Sends immediately, bypassing the queue and any template — used only by "Send test message" in the org dashboard. */
    public ChannelSendResult sendTest(Organization organization, NotificationChannel channel, String destination) {
        OrganizationCommunicationSettings settings = getOrCreateSettings(organization);
        if (!channelEnabled(settings, channel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, channel + " is not enabled for this organization yet.");
        }
        NotificationChannelSender sender = senders.get(channel);
        if (sender == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No sender available for " + channel);
        }
        Notification probe = new Notification();
        probe.setOrganization(organization);
        probe.setChannel(channel);
        probe.setSubject("Test message from " + organization.getName());
        probe.setBody("This is a test message from " + organization.getName() + " via MediUnivers. If you received this, "
                + channel.name() + " is configured correctly.");
        if (channel == NotificationChannel.EMAIL) probe.setRecipientEmail(destination);
        else probe.setRecipientPhone(destination);
        return sender.send(settings, probe);
    }

    // ---------------- Settings ----------------

    @Transactional
    public OrganizationCommunicationSettings getOrCreateSettings(Organization organization) {
        return settingsRepository.findByOrganizationId(organization.getId())
                .orElseGet(() -> {
                    OrganizationCommunicationSettings s = new OrganizationCommunicationSettings();
                    s.setOrganization(organization);
                    return settingsRepository.save(s);
                });
    }

    // ---------------- Read side (org dashboard: notification log) ----------------

    @Transactional(readOnly = true)
    public List<NotificationDto> list(Organization organization, NotificationStatus status, NotificationChannel channel, int limit) {
        Pageable page = Pageable.ofSize(Math.min(Math.max(limit, 1), 200));
        List<Notification> results;
        if (status != null) {
            results = notificationRepository.findByOrganizationIdAndStatusOrderByCreatedAtDesc(organization.getId(), status, page);
        } else if (channel != null) {
            results = notificationRepository.findByOrganizationIdAndChannelOrderByCreatedAtDesc(organization.getId(), channel, page);
        } else {
            results = notificationRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId(), page);
        }
        return results.stream().map(this::toDto).toList();
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(n.getId(), n.getEventType().name(), n.getCategory().name(), n.getChannel().name(),
                n.getPriority().name(), n.getStatus().name(), n.getRecipientName(), n.getRecipientEmail(), n.getRecipientPhone(),
                n.getSubject(), n.getBody(), n.getRetryCount(), n.getMaxRetries(), n.getErrorMessage(),
                n.getScheduledFor(), n.getCreatedAt(), n.getSentAt());
    }

    // ---------------- Header bell (this user's own IN_APP notifications) ----------------

    @Transactional(readOnly = true)
    public List<com.MediUnivers.service.dto.MyNotificationDto> listMine(Long userId, int limit) {
        Pageable page = Pageable.ofSize(Math.min(Math.max(limit, 1), 100));
        return notificationRepository
                .findByRecipientUserIdAndChannelOrderByCreatedAtDesc(userId, NotificationChannel.IN_APP, page)
                .stream().map(this::toMyDto).toList();
    }

    @Transactional(readOnly = true)
    public long countMineUnread(Long userId) {
        return notificationRepository.countByRecipientUserIdAndChannelAndReadFalse(userId, NotificationChannel.IN_APP);
    }

    @Transactional
    public void markMineRead(Long userId, Long notificationId) {
        notificationRepository.findById(notificationId)
                .filter(n -> userId.equals(n.getRecipientUserId()))
                .ifPresent(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    @Transactional
    public void markAllMineRead(Long userId) {
        notificationRepository.findByRecipientUserIdAndChannelOrderByCreatedAtDesc(
                        userId, NotificationChannel.IN_APP, Pageable.ofSize(200))
                .forEach(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    private com.MediUnivers.service.dto.MyNotificationDto toMyDto(Notification n) {
        return new com.MediUnivers.service.dto.MyNotificationDto(
                n.getId(), n.getEventType().name(), n.getSubject(), n.getBody(), n.isRead(), n.getCreatedAt());
    }
}
