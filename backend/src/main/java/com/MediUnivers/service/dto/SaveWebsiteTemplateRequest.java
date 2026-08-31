package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveWebsiteTemplateRequest(
        @NotBlank String code,
        @NotBlank String name,
        @NotBlank String audience,
        String description,
        String previewImageUrl,
        boolean active,
        int sortOrder
) {
}
