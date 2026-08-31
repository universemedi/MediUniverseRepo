package com.MediUnivers.service.dto;

public record PlatformTestimonialDto(
        Long id, String name, String roleCompany, String message, int rating,
        String photoUrl, int sortOrder, boolean published
) {
}
