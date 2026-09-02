package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public record UpdateDoctorRequest(
        @NotBlank String fullName,
        String qualification,
        @NotBlank String registrationNumber,
        Integer experienceYears,
        BigDecimal consultationFee,
        BigDecimal taxPercent,
        List<Long> specializationIds,
        Long branchId,
        boolean visibleOnWebsite,
        /** ACTIVE or INACTIVE — an inactive doctor drops off booking pickers and the public
         * website but their history (appointments, prescriptions) stays intact. */
        String status
) {
}
