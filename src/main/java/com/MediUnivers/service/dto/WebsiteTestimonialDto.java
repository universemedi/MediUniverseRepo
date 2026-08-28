package com.MediUnivers.service.dto;

public record WebsiteTestimonialDto(Long id, String patientName, String message, int rating, String photoUrl, int sortOrder, boolean published) {
}
