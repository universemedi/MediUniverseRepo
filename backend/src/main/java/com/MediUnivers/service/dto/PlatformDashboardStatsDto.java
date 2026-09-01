package com.MediUnivers.service.dto;

import java.math.BigDecimal;

/** Raw counts only — the frontend derives the trend arrows/percentages, same convention as the rest of the Dashboard page. */
public record PlatformDashboardStatsDto(
        long activeOrganizations,
        long newOrganizationsLast30Days,
        long appointmentsToday,
        long appointmentsYesterday,
        BigDecimal pharmacyRevenueToday,
        BigDecimal pharmacyRevenueYesterday,
        long pendingLabResults
) {
}
