package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateRoleRequest(
        @NotBlank String name,
        String description,
        @NotEmpty List<@NotBlank String> actions,
        @NotNull List<RoleAccessInput> access
) {
}
