package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSavedReportRequest(@NotBlank String name, @NotBlank String category, @NotBlank String period) {
}
