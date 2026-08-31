package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record LeadRequest(
        @NotBlank String source,
        @NotBlank String name,
        @Email @NotBlank String email,
        String phone,
        String organizationName,
        String organizationType,
        String city,
        Integer expectedBranches,
        Integer expectedUsers,
        String modulesOfInterest,
        LocalDate preferredDemoDate,
        String message
) {
}
