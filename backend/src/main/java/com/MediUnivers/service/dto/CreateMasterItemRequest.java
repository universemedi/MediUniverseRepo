package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateMasterItemRequest(@NotBlank String code, @NotBlank String name) {
}
