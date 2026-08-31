package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateCrmFollowUpRequest(
        @NotBlank String type,
        Long ownerId,
        @NotNull LocalDate dueDate,
        String notes,
        @NotBlank String status
) {
}
