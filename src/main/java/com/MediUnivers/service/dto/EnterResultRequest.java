package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EnterResultRequest(@NotNull Long orderItemId, @NotBlank String resultValue, String unit, String remarks) {
}
