package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public record CreateDoctorRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank String tempPassword,
        String qualification,
        /** Medical council / state registration number — required by the admin UI. */
        @NotBlank String registrationNumber,
        String photoUrl,
        Integer experienceYears,
        BigDecimal consultationFee,
        BigDecimal taxPercent,
        List<Long> specializationIds,
        Long branchId
) {
}
