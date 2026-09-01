package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record MyProfileDto(String fullName, String email, String phone, LocalDate dateOfBirth) {
}
