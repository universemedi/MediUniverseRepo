package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record AcceptInvitationRequest(@NotBlank String password) {
}
