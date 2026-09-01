package com.MediUnivers.service.dto;

import java.time.Instant;

/** The header bell — a portal-agnostic shape shared by both the org-scoped and platform-scoped notification engines. */
public record MyNotificationDto(
        Long id,
        String eventType,
        String subject,
        String body,
        boolean read,
        Instant createdAt
) {
}
