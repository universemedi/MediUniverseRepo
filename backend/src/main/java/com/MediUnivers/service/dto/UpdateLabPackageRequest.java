package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record UpdateLabPackageRequest(
        @NotBlank String name,
        @NotNull @PositiveOrZero BigDecimal price,
        BigDecimal discountPercent,
        @NotEmpty List<Long> testIds,
        String status
) {
}
