package com.MediUnivers.service.dto;

public record LowStockAlertDto(Long medicineId, String medicineName, String branchName, int reorderLevel, int currentStock) {
}
