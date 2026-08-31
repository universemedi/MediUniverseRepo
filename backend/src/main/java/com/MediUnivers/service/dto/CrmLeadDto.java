package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CrmLeadDto(Long id, String name, String phone, String email, Long sourceId, String sourceName,
                          Long ownerId, String ownerName, BigDecimal value, String status, Instant createdAt) {
}
