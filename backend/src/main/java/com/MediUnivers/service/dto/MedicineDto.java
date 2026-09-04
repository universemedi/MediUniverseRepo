package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record MedicineDto(
        Long id, String code, String name,
        Long categoryId, String category, Long unitId, String unit, Long manufacturerId, String manufacturer,
        String hsnCode, BigDecimal taxPercent, int reorderLevel, boolean controlled, boolean allowSubstitution,
        String status, int availableStock
) {
}
