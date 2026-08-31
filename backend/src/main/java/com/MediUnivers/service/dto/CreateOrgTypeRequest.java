package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;
import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record CreateOrgTypeRequest(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        Set<ModuleGroup> modules
) {
}
