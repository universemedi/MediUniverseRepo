package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRequest(
        @NotBlank String roleCode,
        Long branchId,
        /** ACTIVE or DISABLED — INVITED is a create-time-only state, not settable here. */
        String status
) {
}
