package com.MediUnivers.service.dto;

import java.time.Instant;

public record WebsiteBlogPostDto(
        Long id, String title, String slug, String excerpt, String content, String coverImageUrl,
        String author, boolean published, Instant createdAt, Instant publishedAt
) {
}
