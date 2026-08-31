package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreatePlatformFeatureRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotNull ModuleGroup moduleGroup,
        @NotBlank String featureType
) {
}
