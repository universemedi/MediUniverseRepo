package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PublicBookAppointmentRequest(
        @NotBlank String patientFirstName,
        String patientLastName,
        @NotBlank String phone,
        String email,
        @NotNull Long doctorId,
        @NotNull LocalDate appointmentDate,
        String reason
) {
}
