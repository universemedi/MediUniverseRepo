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

    /** Called once, right after an organization (and its settings row) is created. Safe to call twice — no-op if already seeded. */
    public void seedDefaults(Organization organization) {
        if (templateRepository.existsByOrganizationId(organization.getId())) return;
        for (DefaultTemplateCatalog.Default d : DefaultTemplateCatalog.all()) {
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

    @Transactional(readOnly = true)
    public List<NotificationTemplateDto> list(Organization organization) {
        return templateRepository.findByOrganizationIdOrderByEventTypeAscChannelAsc(organization.getId())
                .stream().map(this::toDto).toList();
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
    public Optional<NotificationTemplate> find(Organization organization, NotificationEventType eventType, NotificationChannel channel) {
        return templateRepository.findByOrganizationIdAndEventTypeAndChannel(organization.getId(), eventType, channel);
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
