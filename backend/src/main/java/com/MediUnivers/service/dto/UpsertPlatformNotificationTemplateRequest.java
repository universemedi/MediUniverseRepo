package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpsertPlatformNotificationTemplateRequest(
        String subject,
        @NotBlank(message = "Template body is required") String body,
        boolean active
) {
}
