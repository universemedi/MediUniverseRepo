package com.MediUnivers.service.dto;

import java.time.Instant;

public record NotificationDto(
        Long id,
        String eventType,
        String category,
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
        Instant scheduledFor,
        Instant createdAt,
        Instant sentAt
) {
}
