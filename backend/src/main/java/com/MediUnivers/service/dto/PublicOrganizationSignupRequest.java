package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * The one field set every public account-creation form collects — the full
 * Organization profile plus the Org Owner's own details (req #6). No plan
 * here on purpose: account creation and plan purchase are two separate
 * steps (req #3) — /free-trial still activates a plan immediately since a
 * trial has no payment step, but /create-account and /select-plan are split.
 */
public record PublicOrganizationSignupRequest(
        @NotBlank String organizationName,
        String subdomain,
        @NotBlank String orgTypeCode,
        @Email String email,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String country,
        String postalCode,
        String gstNumber,
        String registrationNumber,
        String website,
        @NotBlank String headBranchName,
        @NotBlank String ownerFullName,
        @Email @NotBlank String ownerEmail
) {
}
