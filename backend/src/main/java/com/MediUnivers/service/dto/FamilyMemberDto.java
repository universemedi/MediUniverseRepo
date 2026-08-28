package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record FamilyMemberDto(Long id, String name, String relation, String gender, LocalDate dateOfBirth, String phone) {
}
