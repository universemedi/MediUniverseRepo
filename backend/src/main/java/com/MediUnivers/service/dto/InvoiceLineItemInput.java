package com.MediUnivers.service.dto;

import java.math.BigDecimal;

/**
 * The one shape every module hands to BillingService.createInvoice(...).
 * sourceType/sourceId trace a line back to whatever created it (a
 * consultation, a lab test, a medicine sale, or something a future module
 * invents) without the billing engine needing to know that module exists.
 */
public record InvoiceLineItemInput(
        String description, String sourceType, Long sourceId,
        int quantity, BigDecimal unitPrice, BigDecimal discount, BigDecimal taxPercent
) {
    public InvoiceLineItemInput(String description, String sourceType, Long sourceId, int quantity, BigDecimal unitPrice) {
        this(description, sourceType, sourceId, quantity, unitPrice, BigDecimal.ZERO, BigDecimal.ZERO);
    }
}
