package com.MediUnivers.service.dto;

import java.time.Instant;

public record StockLedgerEntryDto(Long id, String type, int quantity, int balanceAfter, String referenceType, Instant createdAt) {
}
