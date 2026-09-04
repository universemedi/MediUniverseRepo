package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record SelectPlanRequest(
        @NotBlank String planCode,
        /** "MONTHLY" or "YEARLY" — defaults to MONTHLY when blank. */
        String billingCycle,
        List<@Valid AddonSelectionInput> addons
) {
}
