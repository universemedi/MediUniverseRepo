package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record ReferralCodeDto(Long id, String code, Long organizationId, String organizationName,
                               BigDecimal rewardAmount, int signupCount, boolean enabled) {
}
