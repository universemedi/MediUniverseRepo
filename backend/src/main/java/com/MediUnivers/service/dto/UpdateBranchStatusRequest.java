package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateBranchStatusRequest(@NotBlank String status) {
}
