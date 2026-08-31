package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCrmLeadSourceRequest(@NotBlank String code, @NotBlank String name) {
}
