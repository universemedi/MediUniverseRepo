package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateDepartmentRequest(@NotBlank String name, String status) {
}
