package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record PrescriptionItemInput(@NotBlank String medicineName, String dosage, String frequency, String duration, String instructions) {
}
