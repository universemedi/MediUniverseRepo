package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateOrganizationRequest(
        @NotBlank String organizationName,
        String subdomain,
        @NotBlank String orgTypeCode,
        @NotBlank String planCode,
        @NotBlank String headBranchName,
        @NotBlank String ownerFullName,
        @Email @NotBlank String ownerEmail,
        /** ONLINE_PURCHASE, FREE_TRIAL, DEMO_CONVERSION, DIRECT_SALES, SUPER_ADMIN — defaults to DIRECT_SALES if omitted */
        String creationSource
) {
}
