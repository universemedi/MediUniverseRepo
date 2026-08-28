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
        Integer experienceYears,
        BigDecimal consultationFee,
        BigDecimal taxPercent,
        List<Long> specializationIds,
        Long branchId
) {
}
