package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePlatformStaffRequest(
        @NotBlank String roleCode,
        @NotBlank String status
) {
}
