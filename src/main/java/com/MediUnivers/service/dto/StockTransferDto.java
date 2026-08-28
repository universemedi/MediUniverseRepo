package com.MediUnivers.service.dto;

import java.time.Instant;

public record StockTransferDto(Long id, String transferNumber, String fromBranch, String toBranch, Instant createdAt, int itemCount) {
}
