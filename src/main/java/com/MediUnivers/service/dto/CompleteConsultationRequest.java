package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CompleteConsultationRequest(
        String chiefComplaint,
        String clinicalNotes,
        String diagnosis,
        BigDecimal heightCm,
        BigDecimal weightKg,
        BigDecimal temperatureF,
        String bloodPressure,
        Integer pulseBpm,
        Integer spo2Percent,
        List<PrescriptionItemInput> prescriptionItems,
        LocalDate followUpDate,
        String followUpNotes
) {
}
