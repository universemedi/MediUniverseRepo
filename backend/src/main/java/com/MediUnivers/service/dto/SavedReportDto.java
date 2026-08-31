package com.MediUnivers.service.dto;

import java.time.Instant;

public record SavedReportDto(Long id, String name, String category, String period, String status, Instant generatedAt) {
}
