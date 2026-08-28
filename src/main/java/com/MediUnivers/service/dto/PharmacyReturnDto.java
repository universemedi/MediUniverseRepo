package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PharmacyReturnDto(Long id, String returnNumber, String saleNumber, String reason, String refundMode, BigDecimal refundAmount, Instant createdAt) {
}
