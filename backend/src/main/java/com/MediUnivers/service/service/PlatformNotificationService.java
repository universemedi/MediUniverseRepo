package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.PlatformCommunicationSettingsDto;
import com.MediUnivers.service.dto.PlatformNotificationDto;
import com.MediUnivers.service.dto.UpdatePlatformCommunicationSettingsRequest;
import com.MediUnivers.service.notification.ChannelSendResult;
import com.MediUnivers.service.notification.PlatformNotificationChannelSender;
import com.MediUnivers.service.repository.PlatformCommunicationSettingsRepository;
import com.MediUnivers.service.repository.PlatformNotificationRepository;
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
 * {@link NotificationService}'s platform-scoped twin: the one entry point for
 * every MediUnivers-origin message (account invites, password resets — never
 * a tenant's own customer communications, which stay on the org-scoped
 * engine). Same queue-then-dispatch shape, MediUnivers' own settings/templates
 * instead of an organization's.
 */
@Service
@Slf4j
public class PlatformNotificationService {

    private final PlatformNotificationRepository notificationRepository;
    private final PlatformCommunicationSettingsRepository settingsRepository;
    private final PlatformNotificationTemplateService templateService;
    private final TemplateRenderService renderService;
    private final Map<NotificationChannel, PlatformNotificationChannelSender> senders;
    private final SecretJsonConfig secretJsonConfig;

    public PlatformNotificationService(PlatformNotificationRepository notificationRepository,
                                        PlatformCommunicationSettingsRepository settingsRepository,
                                        PlatformNotificationTemplateService templateService,
                                        TemplateRenderService renderService,
                                        List<PlatformNotificationChannelSender> senderBeans,
                                        SecretJsonConfig secretJsonConfig) {
        this.notificationRepository = notificationRepository;
        this.settingsRepository = settingsRepository;
        this.templateService = templateService;
        this.renderService = renderService;
        this.senders = senderBeans.stream().collect(Collectors.toMap(PlatformNotificationChannelSender::channel, s -> s));
        this.secretJsonConfig = secretJsonConfig;
    }

    @Transactional
    public void notify(PlatformNotificationEventType eventType, NotificationRecipient recipient,
                        Map<String, String> variables, NotificationPriority priority, String referenceType, Long referenceId) {
        PlatformCommunicationSettings settings = getOrCreateSettings();

        for (NotificationChannel channel : NotificationChannel.values()) {
            if (!channelEnabled(settings, channel)) continue;
            if (channel == NotificationChannel.EMAIL && isBlank(recipient.email())) continue;
            if (channel == NotificationChannel.SMS && isBlank(recipient.phone())) continue;
            if (channel == NotificationChannel.IN_APP && recipient.userId() == null) continue;
            if (channel == NotificationChannel.WHATSAPP) continue;

            templateService.find(eventType, channel)
                    .filter(PlatformNotificationTemplate::isActive)
                    .ifPresent(template -> {
                        PlatformNotification n = new PlatformNotification();
                        n.setEventType(eventType);
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
                        notificationRepository.save(n);
                    });
        }
    }

    private boolean channelEnabled(PlatformCommunicationSettings settings, NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> settings.isEmailEnabled();
            case SMS -> settings.isSmsEnabled();
            case IN_APP -> true;
            default -> false;
        };
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    // ---------------- Dispatch (called only by the scheduler) ----------------

    @Transactional
    public void dispatch(Long notificationId) {
        PlatformNotification n = notificationRepository.findById(notificationId).orElse(null);
        if (n == null) return;
        if (n.getStatus() != NotificationStatus.PENDING && n.getStatus() != NotificationStatus.QUEUED) return;

        n.setStatus(NotificationStatus.PROCESSING);
        PlatformNotificationChannelSender sender = senders.get(n.getChannel());
        if (sender == null) {
            n.setStatus(NotificationStatus.FAILED);
            n.setErrorMessage("No sender registered for channel " + n.getChannel());
            notificationRepository.save(n);
            return;
        }

        PlatformCommunicationSettings settings = getOrCreateSettings();
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
                n.setNextRetryAt(null);
            } else {
                n.setNextRetryAt(Instant.now().plusSeconds(60L * (long) Math.pow(3, n.getRetryCount())));
            }
        }
        notificationRepository.save(n);
    }

    @Transactional
    public void requeueForRetry(PlatformNotification n) {
        n.setStatus(NotificationStatus.QUEUED);
        n.setNextRetryAt(null);
        notificationRepository.save(n);
    }

    List<PlatformNotification> dueImmediate(List<NotificationStatus> statuses) {
        return notificationRepository.findTop100ByStatusInAndScheduledForIsNullOrderByCreatedAtAsc(statuses);
    }

    List<PlatformNotification> dueRetries(Instant now) {
        return notificationRepository.findTop100ByStatusAndNextRetryAtLessThanEqualOrderByCreatedAtAsc(NotificationStatus.FAILED, now);
    }

    // ---------------- Ad-hoc test send ----------------

    public String sendTest(NotificationChannel channel, String destination) {
        if (channel != NotificationChannel.EMAIL && channel != NotificationChannel.SMS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only EMAIL and SMS support a test send.");
        }
        PlatformCommunicationSettings settings = getOrCreateSettings();
        if (!channelEnabled(settings, channel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, channel + " is not enabled for the platform yet.");
        }
        PlatformNotificationChannelSender sender = senders.get(channel);
        if (sender == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No sender available for " + channel);
        }
        PlatformNotification probe = new PlatformNotification();
        probe.setEventType(PlatformNotificationEventType.PASSWORD_RESET_REQUESTED);
        probe.setChannel(channel);
        probe.setSubject("Test message from MediUnivers");
        probe.setBody("This is a test message from MediUnivers platform communication settings. If you received this, "
                + channel.name() + " is configured correctly.");
        if (channel == NotificationChannel.EMAIL) probe.setRecipientEmail(destination);
        else probe.setRecipientPhone(destination);
        ChannelSendResult result = sender.send(settings, probe);
        if (!result.success()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    result.errorMessage() != null ? result.errorMessage() : "Test message could not be delivered.");
        }
        return "Test message sent via " + channel.name() + ".";
    }

    // ---------------- Settings ----------------

    @Transactional
    public PlatformCommunicationSettings getOrCreateSettings() {
        return settingsRepository.findAll().stream().findFirst()
                .orElseGet(() -> settingsRepository.save(new PlatformCommunicationSettings()));
    }

    public PlatformCommunicationSettingsDto getSettingsDto() {
        return toDto(getOrCreateSettings());
    }

    @Transactional
    public PlatformCommunicationSettingsDto updateSettings(UpdatePlatformCommunicationSettingsRequest request) {
        PlatformCommunicationSettings settings = getOrCreateSettings();
        settings.setEmailEnabled(request.emailEnabled());
        settings.setEmailConfigJson(secretJsonConfig.preserveSecretIfBlank(
                settings.getEmailConfigJson(), request.emailConfigJson(), "password"));
        settings.setSmsEnabled(request.smsEnabled());
        settings.setSmsConfigJson(secretJsonConfig.preserveSecretIfBlank(
                settings.getSmsConfigJson(), request.smsConfigJson(), "apiKey"));
        settingsRepository.save(settings);
        return toDto(settings);
    }

    private PlatformCommunicationSettingsDto toDto(PlatformCommunicationSettings s) {
        return new PlatformCommunicationSettingsDto(
                s.isEmailEnabled(), secretJsonConfig.redacted(s.getEmailConfigJson(), "password"),
                secretJsonConfig.isConfigured(s.getEmailConfigJson(), "password"),
                s.isSmsEnabled(), secretJsonConfig.redacted(s.getSmsConfigJson(), "apiKey"),
                secretJsonConfig.isConfigured(s.getSmsConfigJson(), "apiKey"));
    }

    // ---------------- Read side (log) ----------------

    @Transactional(readOnly = true)
    public List<PlatformNotificationDto> list(int limit) {
        Pageable page = Pageable.ofSize(Math.min(Math.max(limit, 1), 200));
        return notificationRepository.findByOrderByCreatedAtDesc(page).stream().map(this::toDto).toList();
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

    private com.MediUnivers.service.dto.MyNotificationDto toMyDto(PlatformNotification n) {
        return new com.MediUnivers.service.dto.MyNotificationDto(
                n.getId(), n.getEventType().name(), n.getSubject(), n.getBody(), n.isRead(), n.getCreatedAt());
    }

    private PlatformNotificationDto toDto(PlatformNotification n) {
        return new PlatformNotificationDto(n.getId(), n.getEventType().name(), n.getChannel().name(),
                n.getPriority().name(), n.getStatus().name(), n.getRecipientName(), n.getRecipientEmail(), n.getRecipientPhone(),
                n.getSubject(), n.getBody(), n.getRetryCount(), n.getMaxRetries(), n.getErrorMessage(),
                n.getCreatedAt(), n.getSentAt());
    }
}
