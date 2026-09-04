package com.MediUnivers.service.dto;

import java.time.Instant;

public record StockLedgerEntryDto(
        Long id, String medicineName, String batchNumber, String type, int quantity, int balanceAfter,
        String referenceType, String note, String createdByName, Instant createdAt
) {
}
