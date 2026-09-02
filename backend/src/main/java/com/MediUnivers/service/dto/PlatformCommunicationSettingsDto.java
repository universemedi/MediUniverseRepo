package com.MediUnivers.service.dto;

public record PlatformCommunicationSettingsDto(
        boolean emailEnabled,
        String emailConfigJson,
        boolean emailPasswordConfigured,
        boolean smsEnabled,
        String smsConfigJson,
        boolean smsKeyConfigured
) {
}
