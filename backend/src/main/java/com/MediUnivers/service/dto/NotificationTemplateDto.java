package com.MediUnivers.service.dto;

public record NotificationTemplateDto(
        Long id,
        String eventType,
        String category,
        String channel,
        String name,
        String subject,
        String body,
        String supportedVariables,
        boolean active,
        boolean locked
) {
}
