package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateFamilyMemberRequest(
        @NotBlank String name,
        @NotBlank String relation,
        String gender,
        LocalDate dateOfBirth,
        String phone
) {
}
