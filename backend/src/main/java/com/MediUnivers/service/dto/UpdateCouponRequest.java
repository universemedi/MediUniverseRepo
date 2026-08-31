package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public record UpdateCouponRequest(
        @NotNull @PositiveOrZero BigDecimal discountPercent,
        LocalDate validFrom,
        LocalDate validTo,
        Set<String> planCodes,
        boolean active
) {
}
