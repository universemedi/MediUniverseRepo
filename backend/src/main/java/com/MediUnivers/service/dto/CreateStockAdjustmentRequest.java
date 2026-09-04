package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateStockAdjustmentRequest(
        @NotNull Long batchId,
        /** signed — negative to write off (damage, loss, expiry disposal), positive to correct an undercount */
        int quantityChange,
        @NotBlank String reason
) {
}
