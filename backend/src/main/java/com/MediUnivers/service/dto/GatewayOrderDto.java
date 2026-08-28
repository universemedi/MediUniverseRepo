package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record GatewayOrderDto(Long invoiceId, String gateway, String gatewayOrderId, BigDecimal amount, String currency, String publicKey) {
}
