package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record CreateReferralCodeRequest(
        @NotBlank String code,
        @NotNull Long organizationId,
        @NotNull @PositiveOrZero BigDecimal rewardAmount
) {
}
