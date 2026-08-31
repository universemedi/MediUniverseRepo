package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record CreateCrmLeadRequest(
        @NotBlank String name,
        @NotBlank String phone,
        String email,
        Long sourceId,
        Long ownerId,
        BigDecimal value
) {
}
