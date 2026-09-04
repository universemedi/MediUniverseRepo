package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record AddonPricingDto(
        String addonType, String label, boolean quantityBased, String unitLabel,
        BigDecimal pricePerUnitMonthly, BigDecimal pricePerUnitYearly, boolean active
) {
}
