package com.MediUnivers.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * keyId is safe to hand to the frontend (it's public — Razorpay Checkout needs it
 * client-side); keySecret must never leave the backend.
 *
 * mock: when true, {@link com.MediUnivers.service.payment.RazorpayGatewayService} skips the
 * real Razorpay API entirely and returns a synthesized order / always-verified payment, so the
 * full subscribe/billing flow can be exercised locally without a real Razorpay account. Takes
 * priority over {@code enabled} — flip it off (and set real keys + enabled=true) for production.
 */
@ConfigurationProperties(prefix = "razorpay")
public record RazorpayProperties(String keyId, String keySecret, boolean enabled, boolean mock) {
}
