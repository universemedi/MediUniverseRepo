package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveBlogPostRequest(
        @NotBlank String title, String excerpt, @NotBlank String content, String coverImageUrl,
        String author, boolean published
) {
}
