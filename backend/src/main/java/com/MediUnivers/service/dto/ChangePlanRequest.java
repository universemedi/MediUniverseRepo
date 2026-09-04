package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ChangePlanRequest(
        @NotBlank String planCode,
        /** "MONTHLY" or "YEARLY" — defaults to MONTHLY when blank. */
        String billingCycle,
        /** Full replacement of the org's addon set for the new period — omit/empty to drop every addon. */
        List<@Valid AddonSelectionInput> addons
) {
}
