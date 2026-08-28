package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PharmacySaleDto(
        Long id, String saleNumber, String type, String status, String patientName, Long consultationId,
        List<PharmacySaleItemDto> items, BigDecimal subtotal, BigDecimal discountTotal, BigDecimal taxTotal,
        BigDecimal grandTotal, String paymentMode, Instant createdAt, Long invoiceId
) {
}
