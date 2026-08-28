package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record LabReferenceRangeDto(
        Long id, String gender, Integer ageMin, Integer ageMax,
        BigDecimal minValue, BigDecimal maxValue, BigDecimal criticalLow, BigDecimal criticalHigh, String unit
) {
}
