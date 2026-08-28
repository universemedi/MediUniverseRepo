package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;

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
        String storageLabel,
        Set<ModuleGroup> modules,
        List<String> highlights
) {
}
