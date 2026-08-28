package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveGalleryImageRequest(@NotBlank String imageUrl, String caption, Integer sortOrder) {
}
