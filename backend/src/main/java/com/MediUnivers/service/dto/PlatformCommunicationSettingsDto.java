package com.MediUnivers.service.dto;

public record PlatformCommunicationSettingsDto(
        boolean emailEnabled,
        String emailConfigJson,
        boolean smsEnabled,
        String smsConfigJson
) {
}
