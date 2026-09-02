package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.util.List;

public record LabTestDto(
        Long id, String code, String name, Long categoryId, String category, Long departmentId, String department,
        String sampleType, BigDecimal price, BigDecimal taxPercent, int tatHours, String status,
        List<LabReferenceRangeDto> referenceRanges
) {
}
