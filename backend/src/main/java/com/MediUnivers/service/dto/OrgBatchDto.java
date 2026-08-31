package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Org-wide batch listing (across every medicine/branch) — distinct from BatchDto, which is scoped to one medicine+branch the caller already knows. */
public record OrgBatchDto(
        Long id, String batchNumber, String medicineName, String branchName,
        LocalDate expiryDate, BigDecimal mrp, int quantityAvailable, boolean expired
) {
}
