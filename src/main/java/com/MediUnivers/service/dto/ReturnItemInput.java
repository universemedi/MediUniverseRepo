package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ReturnItemInput(@NotNull Long saleItemId, @Positive int quantity) {
}
