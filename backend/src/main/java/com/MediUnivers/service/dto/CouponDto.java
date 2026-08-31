package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public record CouponDto(Long id, String code, BigDecimal discountPercent, LocalDate validFrom, LocalDate validTo,
                         Set<String> planCodes, int usageCount, boolean active) {
}
