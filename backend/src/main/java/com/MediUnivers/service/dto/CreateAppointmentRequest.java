package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;

public record CreateAppointmentRequest(
        @NotNull Long patientId,
        @NotNull Long doctorId,
        @NotNull LocalDate appointmentDate,
        Instant scheduledAt,
        String reason,
        Long branchId
) {
}
