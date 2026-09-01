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
        @NotBlank String ownerPhone,
        @NotBlank String country,
        @NotBlank String state,
        @NotBlank String city,
        /** How this deal was actually paid — CASH, BANK_TRANSFER, UPI, CHEQUE, ONLINE. Required unless the plan is a free trial. */
        String paymentMethod,
        /** ONLINE_PURCHASE, FREE_TRIAL, DEMO_CONVERSION, DIRECT_SALES, SUPER_ADMIN — defaults to DIRECT_SALES if omitted */
        String creationSource
) {
}
