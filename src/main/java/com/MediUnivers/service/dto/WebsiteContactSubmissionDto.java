package com.MediUnivers.service.dto;

import java.time.Instant;

public record WebsiteContactSubmissionDto(Long id, String name, String email, String phone, String message, String status, Instant createdAt) {
}
