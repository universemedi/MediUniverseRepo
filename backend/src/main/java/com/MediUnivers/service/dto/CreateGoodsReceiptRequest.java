package com.MediUnivers.service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record CreateGoodsReceiptRequest(
        @NotNull Long supplierId,
        Long purchaseOrderId,
        Long branchId,
        String supplierInvoiceNumber,
        LocalDate supplierInvoiceDate,
        @NotEmpty List<@Valid GoodsReceiptItemInput> items
) {
}
