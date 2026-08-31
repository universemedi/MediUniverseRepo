package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record UpdateCrmLeadRequest(
        Long sourceId,
        Long ownerId,
        BigDecimal value,
        @NotBlank String status
) {
}
