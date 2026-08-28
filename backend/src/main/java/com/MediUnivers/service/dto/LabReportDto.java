package com.MediUnivers.service.dto;

import java.time.Instant;
import java.util.List;

public record LabReportDto(
        Long orderId, String orderNumber, String organizationName, PatientSummaryDto patient, String doctorName,
        List<LabOrderItemDto> items, Instant reportedAt
) {
}
