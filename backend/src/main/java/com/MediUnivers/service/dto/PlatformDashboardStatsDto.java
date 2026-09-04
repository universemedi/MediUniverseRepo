package com.MediUnivers.service.dto;

import java.math.BigDecimal;

/**
 * Raw counts only — the frontend derives trend arrows/percentages. The two
 * revenue fields are null (and revenueVisible is false) for any platform
 * user who isn't Super Admin — see PlatformDashboardService#dashboard.
 */
public record PlatformDashboardStatsDto(
        long activeOrganizations,
        long newOrganizationsLast30Days,
        long openDemoRequests,
        long newDemoRequestsLast30Days,
        long organizationsExpiringWithin30Days,
        Double demoConversionRatePercent,
        boolean revenueVisible,
        BigDecimal subscriptionRevenueThisMonth,
        BigDecimal subscriptionRevenueLastMonth
) {
}
