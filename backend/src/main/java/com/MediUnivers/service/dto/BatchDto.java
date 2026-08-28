package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BatchDto(
        Long id, String batchNumber, LocalDate expiryDate, BigDecimal purchasePrice, BigDecimal mrp,
        int quantityReceived, int quantityAvailable, String supplierName, boolean expired
) {
}
