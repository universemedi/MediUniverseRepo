package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.NotificationEventType;
import com.MediUnivers.service.domain.NotificationTemplate;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.NotificationTemplateDto;
import com.MediUnivers.service.dto.UpsertNotificationTemplateRequest;
import com.MediUnivers.service.repository.NotificationTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

/**
 * Template Engine, organization-scoped (spec §7-8, business rule #2: "no
 * hardcoded messages"). Every org gets its own editable copy of the starter
 * catalog the moment it's created ({@link #seedDefaults}) and can rewrite
 * subject/body or switch a template off entirely from its dashboard —
 * that's the "dynamically configurable from the organization dashboard"
 * requirement this class exists to satisfy.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationTemplateService {

    private final NotificationTemplateRepository templateRepository;

    /** Called right after an organization (and its settings row) is created, and again on every
     * visit to the Notification Templates screen ({@link #list}) — a per-(event, channel) check
     * rather than "skip entirely if this org has any row at all", so an org seeded before some
     * later event type/channel was added to {@link DefaultTemplateCatalog} still picks it up
     * instead of silently missing that notification forever. Already-present rows (including any
     * an admin has customized) are left untouched. */
    public void seedDefaults(Organization organization) {
        for (DefaultTemplateCatalog.Default d : DefaultTemplateCatalog.all()) {
            if (templateRepository.findByOrganizationIdAndEventTypeAndChannel(
                    organization.getId(), d.eventType(), d.channel()).isPresent()) {
                continue;
            }
            NotificationTemplate t = new NotificationTemplate();
            t.setOrganization(organization);
            t.setEventType(d.eventType());
            t.setChannel(d.channel());
            t.setCategory(d.eventType().category());
            t.setName(d.name());
            t.setSubject(d.subject());
            t.setBody(d.body());
            t.setSupportedVariables(d.supportedVariables());
            t.setActive(true);
            templateRepository.save(t);
        }
    }

    /** Event types seeded into every org's catalog for completeness, but never actually sent
     * through this org-scoped engine — account-invite and password-reset emails are always
     * delivered via MediUnivers' own platform mailbox instead (see UserInvitationService,
     * AuthPasswordResetService), specifically so a brand-new org's very first invite still goes
     * out even before anyone has configured this org's own SMTP. Editing these rows here would
     * have no visible effect, so they're hidden rather than shown as if customizable. */
    private static final java.util.Set<NotificationEventType> NEVER_SENT_FROM_ORG_ENGINE =
            java.util.Set.of(NotificationEventType.USER_INVITED, NotificationEventType.PASSWORD_RESET_REQUESTED);

    /** Not read-only: backfills any catalog entries this org is still missing (see
     * {@link #seedDefaults}) before listing, so an org seeded before the catalog grew sees the
     * gap close the next time it opens this screen instead of staying missing indefinitely. */
    public List<NotificationTemplateDto> list(Organization organization) {
        seedDefaults(organization);
        return templateRepository.findByOrganizationIdOrderByEventTypeAscChannelAsc(organization.getId())
                .stream()
                .filter(t -> !NEVER_SENT_FROM_ORG_ENGINE.contains(t.getEventType()))
                .map(this::toDto).toList();
    }

    public NotificationTemplateDto update(Organization organization, Long templateId, UpsertNotificationTemplateRequest request) {
        NotificationTemplate template = requireOwned(organization, templateId);
        if (template.getEventType().isCritical() && !request.active()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This notification is required (billing/security) and cannot be turned off — you can still edit its wording.");
        }
        template.setSubject(request.subject());
        template.setBody(request.body());
        template.setActive(request.active());
        templateRepository.save(template);
        return toDto(template);
    }

    /** Used by NotificationService to render an org's current template for an event/channel — falls back gracefully if missing. */
    @Transactional(readOnly = true)
    /** The actual send path (NotificationService.notify) goes through here for every event —
     * self-heals the same gap {@link #seedDefaults} backfills, at the exact moment it would
     * otherwise have silently dropped a notification for an org that predates this event/channel
     * being added to the catalog, rather than waiting for someone to open the Templates screen. */
    public Optional<NotificationTemplate> find(Organization organization, NotificationEventType eventType, NotificationChannel channel) {
        Optional<NotificationTemplate> existing =
                templateRepository.findByOrganizationIdAndEventTypeAndChannel(organization.getId(), eventType, channel);
        if (existing.isPresent()) return existing;

        return DefaultTemplateCatalog.all().stream()
                .filter(d -> d.eventType() == eventType && d.channel() == channel)
                .findFirst()
                .map(d -> {
                    NotificationTemplate t = new NotificationTemplate();
                    t.setOrganization(organization);
                    t.setEventType(d.eventType());
                    t.setChannel(d.channel());
                    t.setCategory(d.eventType().category());
                    t.setName(d.name());
                    t.setSubject(d.subject());
                    t.setBody(d.body());
                    t.setSupportedVariables(d.supportedVariables());
                    t.setActive(true);
                    return templateRepository.save(t);
                });
    }

    private NotificationTemplate requireOwned(Organization organization, Long templateId) {
        NotificationTemplate t = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));
        if (!t.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This template does not belong to your organization.");
        }
        return t;
    }

    private NotificationTemplateDto toDto(NotificationTemplate t) {
        return new NotificationTemplateDto(t.getId(), t.getEventType().name(), t.getCategory().name(), t.getChannel().name(),
                t.getName(), t.getSubject(), t.getBody(), t.getSupportedVariables(), t.isActive(), t.getEventType().isCritical());
    }
}
