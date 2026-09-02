package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.util.List;

public record DoctorDto(
        Long id,
        String fullName,
        String qualification,
        String registrationNumber,
        String photoUrl,
        Integer experienceYears,
        BigDecimal consultationFee,
        BigDecimal taxPercent,
        List<String> specializations,
        List<Long> specializationIds,
        boolean visibleOnWebsite,
        String status,
        String email,
        Long branchId,
        String branchName
) {
}
