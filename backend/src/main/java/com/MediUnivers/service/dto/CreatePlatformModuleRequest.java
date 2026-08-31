package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePlatformModuleRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotBlank String category
) {
}
