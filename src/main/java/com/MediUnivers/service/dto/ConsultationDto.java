package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ConsultationDto(
        Long id,
        Long appointmentId,
        String status,
        String chiefComplaint,
        String clinicalNotes,
        String diagnosis,
        BigDecimal heightCm,
        BigDecimal weightKg,
        BigDecimal bmi,
        BigDecimal temperatureF,
        String bloodPressure,
        Integer pulseBpm,
        Integer spo2Percent,
        List<PrescriptionItemInput> prescriptionItems,
        LocalDate followUpDate,
        String followUpNotes,
        PatientSummaryDto patient,
        DoctorSummaryDto doctor,
        Instant startedAt,
        Instant completedAt
) {
}
