package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdateBranchRequest(
        @NotBlank String name,
        List<String> enabledModules,
        String email,
        String phone,
        String addressLine1,
        String city,
        String state,
        String country,
        String postalCode
) {
}
