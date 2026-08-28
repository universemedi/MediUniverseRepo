package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSpecializationRequest(@NotBlank String code, @NotBlank String name) {
}
