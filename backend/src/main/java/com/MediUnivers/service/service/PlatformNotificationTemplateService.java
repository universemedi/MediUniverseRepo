package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformNotificationEventType;
import com.MediUnivers.service.domain.PlatformNotificationTemplate;
import com.MediUnivers.service.dto.PlatformNotificationTemplateDto;
import com.MediUnivers.service.dto.UpsertPlatformNotificationTemplateRequest;
import com.MediUnivers.service.repository.PlatformNotificationTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/** Template Engine for platform-origin events — {@link NotificationTemplateService}'s platform-scoped twin, one catalog shared by the whole platform instead of one per org. */
@Service
@RequiredArgsConstructor
@Transactional
public class PlatformNotificationTemplateService {

    private final PlatformNotificationTemplateRepository templateRepository;

    /** Called once at startup. Safe to call repeatedly — no-op once seeded. */
    public void seedDefaults() {
        for (PlatformDefaultTemplateCatalog.Default d : PlatformDefaultTemplateCatalog.all()) {
            if (templateRepository.findByEventTypeAndChannel(d.eventType(), d.channel()).isPresent()) continue;
            PlatformNotificationTemplate t = new PlatformNotificationTemplate();
            t.setEventType(d.eventType());
            t.setChannel(d.channel());
            t.setName(d.name());
            t.setSubject(d.subject());
            t.setBody(d.body());
            t.setSupportedVariables(d.supportedVariables());
            t.setActive(true);
            templateRepository.save(t);
        }
    }

    @Transactional(readOnly = true)
    public List<PlatformNotificationTemplateDto> list() {
        return templateRepository.findAllByOrderByEventTypeAscChannelAsc().stream().map(this::toDto).toList();
    }

    public PlatformNotificationTemplateDto update(Long templateId, UpsertPlatformNotificationTemplateRequest request) {
        PlatformNotificationTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + templateId));
        template.setSubject(request.subject());
        template.setBody(request.body());
        template.setActive(request.active());
        templateRepository.save(template);
        return toDto(template);
    }

    @Transactional(readOnly = true)
    public Optional<PlatformNotificationTemplate> find(PlatformNotificationEventType eventType, NotificationChannel channel) {
        return templateRepository.findByEventTypeAndChannel(eventType, channel);
    }

    private PlatformNotificationTemplateDto toDto(PlatformNotificationTemplate t) {
        return new PlatformNotificationTemplateDto(t.getId(), t.getEventType().name(), t.getChannel().name(),
                t.getName(), t.getSubject(), t.getBody(), t.getSupportedVariables(), t.isActive());
    }
}
