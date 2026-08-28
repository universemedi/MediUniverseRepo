package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record LabReferenceRangeInput(
        String gender, Integer ageMin, Integer ageMax,
        BigDecimal minValue, BigDecimal maxValue, BigDecimal criticalLow, BigDecimal criticalHigh, String unit
) {
}
