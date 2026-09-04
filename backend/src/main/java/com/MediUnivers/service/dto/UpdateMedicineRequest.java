package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record UpdateMedicineRequest(
        @NotBlank String code,
        @NotBlank String name,
        Long categoryId,
        Long unitId,
        Long manufacturerId,
        String hsnCode,
        BigDecimal taxPercent,
        Integer reorderLevel,
        boolean controlled,
        boolean allowSubstitution,
        String status
) {
}
