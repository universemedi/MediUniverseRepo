package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateDepartmentRequest(@NotBlank String code, @NotBlank String name) {
}
