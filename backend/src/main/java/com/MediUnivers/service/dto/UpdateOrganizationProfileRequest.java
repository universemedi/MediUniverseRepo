package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateOrganizationProfileRequest(
        @NotBlank @Size(min = 3, max = 150) String name,
        String email,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String country,
        String postalCode,
        String timezone,
        String currency,
        String gstNumber,
        String registrationNumber,
        String website,
        String logoUrl
) {
}
