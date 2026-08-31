package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SelectPlanRequest(@NotBlank String planCode) {
}
