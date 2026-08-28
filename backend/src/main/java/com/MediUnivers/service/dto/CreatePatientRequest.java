package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreatePatientRequest(
        @NotBlank String firstName,
        String lastName,
        String gender,
        LocalDate dateOfBirth,
        @NotBlank String phone,
        String email,
        String bloodGroup,
        String address,
        Long branchId
) {
}
