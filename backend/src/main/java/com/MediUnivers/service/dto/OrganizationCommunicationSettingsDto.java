package com.MediUnivers.service.dto;

public record OrganizationCommunicationSettingsDto(
        boolean emailEnabled,
        String emailProvider,
        String emailConfigJson,
        boolean emailPasswordConfigured,
        boolean smsEnabled,
        String smsProvider,
        String smsConfigJson,
        boolean smsSecretConfigured,
        boolean whatsappEnabled,
        String whatsappProvider,
        String whatsappConfigJson,
        boolean whatsappKeyConfigured,
        boolean inAppEnabled
) {
}
