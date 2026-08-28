package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveTestimonialRequest(@NotBlank String patientName, @NotBlank String message, Integer rating, String photoUrl, Integer sortOrder, boolean published) {
}
