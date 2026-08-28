package com.MediUnivers.service.dto;

import java.time.Instant;
import java.time.LocalDate;

public record AppointmentDto(
        Long id,
        String appointmentNumber,
        String tokenNumber,
        String type,
        String status,
        LocalDate appointmentDate,
        Instant scheduledAt,
        String reason,
        PatientSummaryDto patient,
        DoctorSummaryDto doctor
) {
}
