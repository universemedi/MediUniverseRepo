package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.util.List;

public record LabPackageDto(Long id, String name, BigDecimal price, BigDecimal discountPercent, List<String> testNames, String status) {
}
