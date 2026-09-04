package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;

public record RescheduleAppointmentRequest(
        @NotNull LocalDate appointmentDate,
        Instant scheduledAt,
        Long doctorId
) {
}
