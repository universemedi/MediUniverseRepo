package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public record CreatePlanRequest(
        @NotBlank String code,
        @NotBlank String name,
        String tagline,
        @PositiveOrZero int maxBranches,
        @PositiveOrZero int maxUsers,
        @PositiveOrZero int maxDoctorsPerBranch,
        @NotBlank String storageLabel,
        @NotNull @PositiveOrZero BigDecimal priceWithoutTax,
        @NotNull @PositiveOrZero BigDecimal taxPercent,
        boolean freeTrial,
        @PositiveOrZero int freeTrialDays,
        /** Availability window — null means always available. */
        LocalDate validFrom,
        LocalDate validTo,
        Set<ModuleGroup> modules,
        List<String> highlights
) {
}
