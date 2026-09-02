package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record UpdateLabTestRequest(
        @NotBlank String code,
        @NotBlank String name,
        Long categoryId,
        Long departmentId,
        @NotBlank String sampleType,
        @NotNull BigDecimal price,
        BigDecimal taxPercent,
        Integer tatHours,
        String status,
        List<LabReferenceRangeInput> referenceRanges
) {
}
