package com.MediUnivers.service.dto;

import java.time.Instant;

public record CrmActivityDto(Long id, Long leadId, String leadName, String activityType, Long ownerId, String ownerName,
                              String notes, Instant createdAt) {
}
