package com.MediUnivers.service.dto;

import java.time.Instant;

public record GoodsReceiptDto(Long id, String grnNumber, String supplierName, Instant receivedAt, int itemCount) {
}
