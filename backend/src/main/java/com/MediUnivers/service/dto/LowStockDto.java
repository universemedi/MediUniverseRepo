package com.MediUnivers.service.dto;

public record LowStockDto(Long medicineId, String medicineName, int reorderLevel, int currentStock) {
}
