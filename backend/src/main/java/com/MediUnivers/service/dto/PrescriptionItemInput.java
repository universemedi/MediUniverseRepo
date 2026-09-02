package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record PrescriptionItemInput(Long medicineId, @NotBlank String medicineName, String dosage, String frequency, String duration, String instructions) {
}
