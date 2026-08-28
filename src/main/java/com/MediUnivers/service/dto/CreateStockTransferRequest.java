package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateStockTransferRequest(
        @NotNull Long fromBranchId,
        @NotNull Long toBranchId,
        @NotEmpty List<@Valid StockTransferItemInput> items
) {
}
