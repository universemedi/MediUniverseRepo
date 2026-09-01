package com.MediUnivers.service.dto;

import java.time.Instant;
import java.time.LocalDate;

public record LeadDto(
        Long id,
        String source,
        String name,
        String email,
        String phone,
        String organizationName,
        String organizationType,
        String city,
        String state,
        Integer expectedBranches,
        Integer expectedUsers,
        String modulesOfInterest,
        LocalDate preferredDemoDate,
        String message,
        String internalNotes,
        Long assignedToUserId,
        String assignedToName,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
