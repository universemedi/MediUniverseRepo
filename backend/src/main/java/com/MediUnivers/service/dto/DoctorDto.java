package com.MediUnivers.service.dto;

import java.math.BigDecimal;
import java.util.List;

public record DoctorDto(
        Long id,
        String fullName,
        String qualification,
        Integer experienceYears,
        BigDecimal consultationFee,
        BigDecimal taxPercent,
        List<String> specializations,
        String status,
        String email,
        Long branchId,
        String branchName
) {
}
