package com.MediUnivers.service.dto;

import java.time.Instant;
import java.util.List;

public record LabOrderDto(
        Long id, String orderNumber, String status, PatientSummaryDto patient, String doctorName,
        List<LabOrderItemDto> items, Instant createdAt, Long invoiceId
) {
}
