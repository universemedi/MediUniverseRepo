package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCrmActivityRequest(@NotNull Long leadId, @NotBlank String activityType, String notes) {
}
