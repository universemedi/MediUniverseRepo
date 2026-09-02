package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PublicBookAppointmentRequest(
        @NotBlank String patientFirstName,
        String patientLastName,
        @NotBlank String phone,
        String email,
        @NotNull Long doctorId,
        @NotNull LocalDate appointmentDate,
        String reason,
        /** Which branch to book at — required once an org has more than one; falls back to the
         * head office branch when omitted (single-branch orgs never need to ask). */
        Long branchId
) {
}
