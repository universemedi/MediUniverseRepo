package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record UpdateReferralCodeRequest(
        @NotNull @PositiveOrZero BigDecimal rewardAmount,
        boolean enabled
) {
}
