package com.MediUnivers.service.dto;

public record PlatformNotificationTemplateDto(
        Long id,
        String eventType,
        String channel,
        String name,
        String subject,
        String body,
        String supportedVariables,
        boolean active
) {
}
