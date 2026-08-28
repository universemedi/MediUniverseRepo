package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;

public record WalkInRequest(@NotNull Long patientId, @NotNull Long doctorId, String reason, Long branchId) {
}
