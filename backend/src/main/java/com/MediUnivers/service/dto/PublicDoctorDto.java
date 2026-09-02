package com.MediUnivers.service.dto;

import java.util.List;

public record PublicDoctorDto(Long id, String fullName, String qualification, String photoUrl, Integer experienceYears,
        List<String> specializations, Long branchId) {
}
