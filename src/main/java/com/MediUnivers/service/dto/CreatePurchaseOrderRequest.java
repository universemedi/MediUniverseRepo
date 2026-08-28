package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreatePurchaseOrderRequest(
        @NotNull Long supplierId,
        Long branchId,
        @NotEmpty List<@Valid PurchaseOrderItemInput> items
) {
}
