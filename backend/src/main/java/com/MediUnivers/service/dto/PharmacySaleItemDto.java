package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record PharmacySaleItemDto(
        Long id, String medicineName, String batchNumber, int quantity, int quantityReturned,
        BigDecimal mrp, BigDecimal discount, BigDecimal taxPercent, BigDecimal lineTotal
) {
}
