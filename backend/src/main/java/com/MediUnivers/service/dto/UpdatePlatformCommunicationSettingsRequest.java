package com.MediUnivers.service.dto;

public record UpdatePlatformCommunicationSettingsRequest(
        boolean emailEnabled,
        String emailConfigJson,
        boolean smsEnabled,
        String smsConfigJson
) {
}
