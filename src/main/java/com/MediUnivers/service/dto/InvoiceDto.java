package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record InvoiceDto(
        Long id, String invoiceNumber, String sourceModule, String status,
        PatientSummaryDto patient, List<InvoiceLineItemDto> lineItems, List<PaymentDto> payments,
        BigDecimal subtotal, BigDecimal discountTotal, BigDecimal taxTotal, BigDecimal grandTotal,
        BigDecimal amountPaid, BigDecimal balanceDue, Instant createdAt
) {
}
