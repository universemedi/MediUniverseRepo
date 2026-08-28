package com.MediUnivers.service.dto;

import java.util.List;

public record PublicDoctorDto(Long id, String fullName, String qualification, Integer experienceYears, List<String> specializations) {
}
