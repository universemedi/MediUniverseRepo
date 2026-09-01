package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdatePlatformStaffRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        String phone,
        @NotBlank String roleCode,
        @NotBlank String status
) {
}
