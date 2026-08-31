package com.MediUnivers.service.payment;

import java.math.BigDecimal;

/**
 * What a gateway hands back after creating an order — enough for the frontend's checkout widget to open.
 *
 * @param mock true when this order was synthesized locally instead of created on the real gateway
 *             (see {@code razorpay.mock}) — the frontend uses this to skip opening the real checkout
 *             widget (which would fail against a fake order/key) and confirm the "payment" directly.
 */
public record GatewayOrderResult(String gatewayOrderId, BigDecimal amount, String currency, String publicKey, boolean mock) {
}
