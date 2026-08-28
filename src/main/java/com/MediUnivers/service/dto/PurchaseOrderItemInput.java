package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record PurchaseOrderItemInput(@NotNull Long medicineId, @Positive int quantity, @NotNull BigDecimal rate) {
}
