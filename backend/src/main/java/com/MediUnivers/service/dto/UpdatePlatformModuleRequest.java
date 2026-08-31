package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePlatformModuleRequest(
        @NotBlank String name,
        @NotBlank String category,
        boolean active
) {
}
