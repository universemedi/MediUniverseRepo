package com.MediUnivers.service.dto;

public record PlatformContentCardDto(
        Long id, String section, String icon, String title, String tag,
        String description, String bulletsText, int sortOrder, boolean published
) {
}
