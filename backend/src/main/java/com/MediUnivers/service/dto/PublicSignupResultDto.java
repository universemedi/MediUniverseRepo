package com.MediUnivers.service.dto;

/** Returned by /api/public/organizations/subscribe — the signupToken must be sent back (X-Signup-Token) for the gateway-order and confirm steps. */
public record PublicSignupResultDto(Long organizationId, String organizationCode, String signupToken, String status) {
}
