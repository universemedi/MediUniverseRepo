package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoodsReceiptItemDto(
        Long id, String medicineName, String batchNumber, LocalDate expiryDate, LocalDate manufacturingDate,
        int quantity, BigDecimal purchasePrice, BigDecimal mrp
) {
}
