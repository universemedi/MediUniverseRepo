package com.MediUnivers.service.dto;

import java.util.List;
import java.util.Map;

public record PlatformDashboardDto(
        PlatformDashboardStatsDto stats,
        /** Last 6 months, each row shaped {name, Appointments, Revenue} — ready for the recharts area chart. */
        List<Map<String, Object>> appointmentsRevenueTrend,
        /** Each row shaped {name, Organizations} — one bar per organization type actually in use. */
        List<Map<String, Object>> organizationsByType
) {
}
