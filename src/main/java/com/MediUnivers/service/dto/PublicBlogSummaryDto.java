package com.MediUnivers.service.dto;

import java.time.Instant;

public record PublicBlogSummaryDto(Long id, String title, String slug, String excerpt, String coverImageUrl, Instant publishedAt) {
}
