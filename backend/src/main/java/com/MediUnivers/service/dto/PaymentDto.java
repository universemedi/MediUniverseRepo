package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentDto(
        Long id, String paymentNumber, BigDecimal amount, String mode, String reference,
        boolean refund, String note, String receivedByName, Instant receivedAt
) {
}
