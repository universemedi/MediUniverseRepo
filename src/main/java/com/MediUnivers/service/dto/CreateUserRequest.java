package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateUserRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank String roleCode,
        Long branchId,
        /** ALL_BRANCHES or SELECTED_BRANCHES — defaults to ALL_BRANCHES if omitted */
        String branchScope,
        List<Long> selectedBranchIds
) {
}
