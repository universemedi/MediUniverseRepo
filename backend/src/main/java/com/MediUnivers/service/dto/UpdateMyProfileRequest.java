package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record UpdateMyProfileRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        String phone,
        LocalDate dateOfBirth
) {
}
