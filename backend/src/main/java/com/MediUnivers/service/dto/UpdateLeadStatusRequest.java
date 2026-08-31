package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateLeadStatusRequest(@NotBlank String status) {
}
