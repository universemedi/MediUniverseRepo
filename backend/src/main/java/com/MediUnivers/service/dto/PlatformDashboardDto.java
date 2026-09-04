package com.MediUnivers.service.dto;

import java.util.List;
import java.util.Map;

public record PlatformDashboardDto(
        PlatformDashboardStatsDto stats,
        /** Live organizations whose current subscription renews within the next 30 days, soonest first. */
        List<ExpiringOrganizationDto> organizationsExpiringSoon,
        /** One row per business module, shaped {name, Organizations} — how many live organizations have it unlocked. */
        List<Map<String, Object>> modulePopularity,
        /** Last 6 months, each row shaped {name, "Demo requests", "Converted to live"} — cohort by request month. */
        List<Map<String, Object>> demoConversionTrend,
        /** Each row shaped {name, Organizations} — one bar/slice per plan currently in use. */
        List<Map<String, Object>> subscriptionTypeMix,
        /** Last 6 months, each row shaped {name, Revenue} — empty unless stats.revenueVisible is true. */
        List<Map<String, Object>> subscriptionRevenueTrend
) {
}
