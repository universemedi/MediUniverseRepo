package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record LabOrderItemDto(Long id, Long testId, String testName, String sampleType, BigDecimal price, BigDecimal taxPercent, LabResultDto result) {
}
