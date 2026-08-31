package com.MediUnivers.service.dto;

public record UpdateOrganizationCommunicationSettingsRequest(
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
