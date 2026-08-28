package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record PharmacyDashboardDto(
        long pendingPrescriptions, long todaysSalesCount, BigDecimal todaysRevenue,
        long lowStockCount, long expiringSoonCount
) {
}
