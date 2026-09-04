package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public record PlanDto(
        Long id,
        String code,
        String name,
        String priceLabel,
        String tagline,
        int maxBranches,
        int maxUsers,
        int maxDoctorsPerBranch,
        String storageLabel,
        BigDecimal priceWithoutTax,
        BigDecimal taxPercent,
        BigDecimal priceWithTax,
        /** Null when this plan isn't offered yearly yet — the frontend falls back to priceWithoutTax x 12. */
        BigDecimal priceWithoutTaxYearly,
        BigDecimal priceWithTaxYearly,
        boolean freeTrial,
        int freeTrialDays,
        boolean active,
        boolean defaultSelected,
        LocalDate validFrom,
        LocalDate validTo,
        Set<ModuleGroup> modules,
        List<String> highlights
) {
}
