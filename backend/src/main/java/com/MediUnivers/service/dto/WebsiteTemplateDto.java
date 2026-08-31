package com.MediUnivers.service.dto;

public record WebsiteTemplateDto(
        Long id, String code, String name, String audience, String description,
        String previewImageUrl, boolean active, int sortOrder
) {
}
