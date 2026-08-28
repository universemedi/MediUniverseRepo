package com.MediUnivers.service.dto;

import java.time.Instant;

public record LabResultDto(
        Long id, String resultValue, String unit, String remarks, String flag, String status,
        String enteredByName, Instant enteredAt, String verifiedByName, Instant verifiedAt
) {
}
