package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record PurchaseOrderItemDto(Long id, String medicineName, int quantityOrdered, int quantityReceived, BigDecimal rate) {
}
