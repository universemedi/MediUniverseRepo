package com.MediUnivers.service.dto;

public record OrganizationCommunicationSettingsDto(
        boolean emailEnabled,
        String emailProvider,
        String emailConfigJson,
        boolean smsEnabled,
        String smsProvider,
        String smsConfigJson,
        boolean whatsappEnabled,
        String whatsappProvider,
        String whatsappConfigJson,
        boolean inAppEnabled
) {
}
