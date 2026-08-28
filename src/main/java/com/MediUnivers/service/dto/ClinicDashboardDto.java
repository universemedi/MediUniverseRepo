package com.MediUnivers.service.dto;

public record ClinicDashboardDto(
        long todaysAppointments,
        long checkedIn,
        long inConsultation,
        long completedToday,
        long totalPatients,
        long totalDoctors
) {
}
