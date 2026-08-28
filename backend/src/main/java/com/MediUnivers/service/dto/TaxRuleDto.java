package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record TaxRuleDto(Long id, String code, String name, BigDecimal percentage, boolean platformDefault) {
}
