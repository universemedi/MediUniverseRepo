package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record BillingDashboardDto(
        long unpaidInvoices, BigDecimal totalOutstanding, long todaysInvoices, BigDecimal todaysCollections
) {
}
