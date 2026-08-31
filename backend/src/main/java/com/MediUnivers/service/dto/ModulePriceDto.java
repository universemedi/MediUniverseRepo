package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record ModulePriceDto(String moduleGroup, String label, BigDecimal pricePerMonth, boolean active) {
}
