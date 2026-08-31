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
        boolean freeTrial,
        int freeTrialDays,
        boolean active,
        LocalDate validFrom,
        LocalDate validTo,
        Set<ModuleGroup> modules,
        List<String> highlights
) {
}
