package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record SubscriptionAddonDto(
        String addonType, String label, boolean quantityBased, String unitLabel,
        int quantity, BigDecimal unitPriceWithTax, BigDecimal lineTotalWithTax
) {
}
