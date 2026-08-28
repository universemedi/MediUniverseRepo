package com.MediUnivers.service.dto;

public record LabDashboardDto(
        long todaysOrders, long pendingCollection, long pendingResults, long pendingVerification,
        long completedReports, long rejectedSamples
) {
}
