package com.MediUnivers.service.dto;

import java.time.Instant;

public record PlatformNotificationDto(
        Long id,
        String eventType,
        String channel,
        String priority,
        String status,
        String recipientName,
        String recipientEmail,
        String recipientPhone,
        String subject,
        String body,
        int retryCount,
        int maxRetries,
        String errorMessage,
        Instant createdAt,
        Instant sentAt
) {
}
