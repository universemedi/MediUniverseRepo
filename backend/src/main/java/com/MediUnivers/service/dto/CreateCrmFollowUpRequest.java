package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateCrmFollowUpRequest(
        @NotNull Long leadId,
        @NotBlank String type,
        Long ownerId,
        @NotNull LocalDate dueDate,
        String notes
) {
}
