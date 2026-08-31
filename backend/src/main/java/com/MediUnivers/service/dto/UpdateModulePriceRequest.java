package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateModulePriceRequest(@NotNull @PositiveOrZero BigDecimal pricePerMonth, boolean active) {
}
