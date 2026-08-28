package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record PatientDto(
        Long id,
        String patientNumber,
        String firstName,
        String lastName,
        String gender,
        LocalDate dateOfBirth,
        String phone,
        String email,
        String bloodGroup,
        String address,
        String status,
        Long branchId,
        String branchName
) {
}
