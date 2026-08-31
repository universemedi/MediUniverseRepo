package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePlanRequest(@NotBlank String planCode) {
}
