package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SubscriptionDto(
        Long id,
        Long organizationId,
        String organizationName,
        String planCode,
        String planName,
        LocalDate startDate,
        LocalDate endDate,
        boolean freeTrial,
        Integer freeTrialDays,
        BigDecimal priceWithoutTax,
        BigDecimal taxPercent,
        BigDecimal priceWithTax,
        String status
) {
}
