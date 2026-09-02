package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoodsReceiptItemInput(
        @NotNull Long medicineId,
        @NotBlank String batchNumber,
        @NotNull LocalDate expiryDate,
        LocalDate manufacturingDate,
        @Positive int quantity,
        @NotNull BigDecimal purchasePrice,
        @NotNull BigDecimal mrp
) {
}
