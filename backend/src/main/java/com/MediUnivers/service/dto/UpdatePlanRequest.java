package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public record UpdatePlanRequest(
        @NotBlank String name,
        String tagline,
        @PositiveOrZero int maxBranches,
        @PositiveOrZero int maxUsers,
        @PositiveOrZero int maxDoctorsPerBranch,
        @NotBlank String storageLabel,
        @NotNull @PositiveOrZero BigDecimal priceWithoutTax,
        @NotNull @PositiveOrZero BigDecimal taxPercent,
        /** Null means this plan isn't offered yearly — checkout falls back to priceWithoutTax x 12. */
        @PositiveOrZero BigDecimal priceWithoutTaxYearly,
        boolean freeTrial,
        @PositiveOrZero int freeTrialDays,
        boolean active,
        boolean defaultSelected,
        /** Availability window — null means always available. */
        LocalDate validFrom,
        LocalDate validTo,
        Set<ModuleGroup> modules,
        List<String> highlights
) {
}
