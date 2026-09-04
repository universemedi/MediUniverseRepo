package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Set;

/** Build-your-own plan: price is the sum of each selected module's per-month rate (req: "provide customize plan option based on module selection"). */
public record SelectCustomPlanRequest(
        @NotEmpty Set<String> modules,
        @Min(1) int maxBranches,
        @Min(1) int maxUsers,
        @Min(1) int maxDoctorsPerBranch,
        /** "MONTHLY" or "YEARLY" — defaults to MONTHLY when blank. */
        String billingCycle,
        List<@Valid AddonSelectionInput> addons
) {
}
