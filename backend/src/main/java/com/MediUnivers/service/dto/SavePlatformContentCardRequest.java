package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SavePlatformContentCardRequest(
        @NotBlank String section, String icon, @NotBlank String title, String tag,
        String description, String bulletsText, Integer sortOrder, boolean published
) {
}
