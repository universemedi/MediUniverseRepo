package com.MediUnivers.service.dto;

public record PharmacyQueueItemDto(
        Long consultationId, String patientName, String patientNumber, String doctorName,
        int medicineCount, String pharmacyStatus
) {
}
