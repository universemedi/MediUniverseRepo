package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record ExpiringBatchDto(Long batchId, String medicineName, String batchNumber, LocalDate expiryDate, int quantityAvailable) {
}
