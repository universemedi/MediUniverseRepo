package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record InvoiceLineItemDto(
        Long id, String description, String sourceType, Long sourceId,
        int quantity, BigDecimal unitPrice, BigDecimal discount, BigDecimal taxPercent, BigDecimal lineTotal
) {
}
