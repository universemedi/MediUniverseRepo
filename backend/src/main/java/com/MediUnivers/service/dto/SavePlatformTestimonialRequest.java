package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SavePlatformTestimonialRequest(
        @NotBlank String name, String roleCompany, @NotBlank String message,
        Integer rating, String photoUrl, Integer sortOrder, boolean published
) {
}
