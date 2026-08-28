package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record StockTransferItemInput(@NotNull Long medicineId, @Positive int quantity) {
}
