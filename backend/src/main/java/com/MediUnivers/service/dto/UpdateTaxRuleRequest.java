package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateTaxRuleRequest(@NotBlank String name, @NotNull @PositiveOrZero BigDecimal percentage, boolean active) {
}
