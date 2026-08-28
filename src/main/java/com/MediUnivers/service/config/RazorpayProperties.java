package com.MediUnivers.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * keyId is safe to hand to the frontend (it's public — Razorpay Checkout needs it
 * client-side); keySecret must never leave the backend.
 */
@ConfigurationProperties(prefix = "razorpay")
public record RazorpayProperties(String keyId, String keySecret, boolean enabled) {
}
