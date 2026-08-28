package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateGoodsReceiptRequest(
        @NotNull Long supplierId,
        Long purchaseOrderId,
        Long branchId,
        @NotEmpty List<@Valid GoodsReceiptItemInput> items
) {
}
