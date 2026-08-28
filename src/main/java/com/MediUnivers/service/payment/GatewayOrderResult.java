package com.MediUnivers.service.payment;

import java.math.BigDecimal;

/** What a gateway hands back after creating an order — enough for the frontend's checkout widget to open. */
public record GatewayOrderResult(String gatewayOrderId, BigDecimal amount, String currency, String publicKey) {
}
