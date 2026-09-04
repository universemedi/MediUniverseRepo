package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateAddonPricingRequest(
        @NotNull @PositiveOrZero BigDecimal pricePerUnitMonthly,
        @PositiveOrZero BigDecimal pricePerUnitYearly,
        boolean active
) {
}
