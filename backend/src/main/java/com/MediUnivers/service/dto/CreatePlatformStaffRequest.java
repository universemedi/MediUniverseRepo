package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreatePlatformStaffRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank String roleCode
) {
}
