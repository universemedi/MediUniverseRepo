package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateLabOrderRequest(
        @NotNull Long patientId,
        Long doctorId,
        Long consultationId,
        Long branchId,
        @NotEmpty List<Long> testIds
) {
}
