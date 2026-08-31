package com.MediUnivers.service.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Tax-inclusive pricing, computed on the fly rather than stored — single GST-style rate (spec §7). */
public final class PricingCalculator {

    private PricingCalculator() {
    }

    public static BigDecimal withTax(BigDecimal priceWithoutTax, BigDecimal taxPercent) {
        if (priceWithoutTax == null) return BigDecimal.ZERO;
        BigDecimal percent = taxPercent == null ? BigDecimal.ZERO : taxPercent;
        BigDecimal multiplier = BigDecimal.ONE.add(percent.divide(BigDecimal.valueOf(100)));
        return priceWithoutTax.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
    }
}
