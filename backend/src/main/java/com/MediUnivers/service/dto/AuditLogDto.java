package com.MediUnivers.service.dto;

import java.time.Instant;

public record AuditLogDto(Long id, String actorName, String action, String entityType, String entityId,
                           Long organizationId, String organizationName, String ipAddress, Instant createdAt) {
}
