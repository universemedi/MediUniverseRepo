package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record BookPatientAppointmentRequest(
        @NotNull Long doctorId,
        @NotNull LocalDate appointmentDate,
        @NotNull LocalTime time,
        String reason
) {
}
