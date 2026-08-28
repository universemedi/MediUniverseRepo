package com.MediUnivers.service.dto;

import java.time.Instant;
import java.util.List;

public record PurchaseOrderDto(
        Long id, String poNumber, String supplierName, String status, Instant createdAt, List<PurchaseOrderItemDto> items
) {
}
