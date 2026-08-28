package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LeadRequest(
        @NotBlank String source,
        @NotBlank String name,
        @Email @NotBlank String email,
        String phone,
        String organizationName,
        String organizationType,
        String city,
        Integer expectedBranches,
        String message
) {
}
