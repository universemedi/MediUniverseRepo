package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAppointmentStatusRequest(@NotBlank String status) {
}
