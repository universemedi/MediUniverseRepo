package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AddonType;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.OrganizationCommunicationSettings;
import com.MediUnivers.service.dto.OrganizationCommunicationSettingsDto;
import com.MediUnivers.service.dto.TestSendNotificationRequest;
import com.MediUnivers.service.dto.UpdateOrganizationCommunicationSettingsRequest;
import com.MediUnivers.service.notification.ChannelSendResult;
import com.MediUnivers.service.repository.OrganizationCommunicationSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

/**
 * The organization dashboard's view of the Communication Engine: which
 * channels (Email/SMS/WhatsApp/In-App) are switched on and their provider
 * credentials (spec §24, "Providers are configurable"). This is the "make
 * communication type configurable from the organization dashboard"
 * requirement — everything here is per-organization, never a shared global
 * setting.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OrganizationCommunicationService {

    private final OrganizationCommunicationSettingsRepository settingsRepository;
    private final NotificationService notificationService;
    private final SecretJsonConfig secretJsonConfig;
    private final AddonAccessService addonAccessService;

    @Transactional(readOnly = true)
    public OrganizationCommunicationSettingsDto getSettings(Organization organization) {
        return toDto(notificationService.getOrCreateSettings(organization));
    }

    public OrganizationCommunicationSettingsDto updateSettings(Organization organization, UpdateOrganizationCommunicationSettingsRequest request) {
        if (request.smsEnabled() && !addonAccessService.hasAddon(organization, AddonType.SMS)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Buy the SMS addon to turn on SMS notifications.");
        }
        if (request.whatsappEnabled() && !addonAccessService.hasAddon(organization, AddonType.WHATSAPP)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Buy the WhatsApp addon to turn on WhatsApp messaging.");
        }
        OrganizationCommunicationSettings settings = notificationService.getOrCreateSettings(organization);
        settings.setEmailEnabled(request.emailEnabled());
        settings.setEmailProvider(orDefault(request.emailProvider(), "SMTP"));
        settings.setEmailConfigJson(secretJsonConfig.preserveSecretIfBlank(
                settings.getEmailConfigJson(), request.emailConfigJson(), "password"));
        settings.setSmsEnabled(request.smsEnabled());
        settings.setSmsProvider(orDefault(request.smsProvider(), "LOCAL_GATEWAY"));
        settings.setSmsConfigJson(secretJsonConfig.preserveSecretIfBlank(
                settings.getSmsConfigJson(), request.smsConfigJson(), "apiSecret"));
        settings.setWhatsappEnabled(request.whatsappEnabled());
        settings.setWhatsappProvider(orDefault(request.whatsappProvider(), "WHATSAPP_CLOUD_API"));
        settings.setWhatsappConfigJson(secretJsonConfig.preserveSecretIfBlank(
                settings.getWhatsappConfigJson(), request.whatsappConfigJson(), "apiKey"));
        settings.setInAppEnabled(request.inAppEnabled());
        settingsRepository.save(settings);
        return toDto(settings);
    }

    /** "Send test message" on the Communication Settings screen — proves the saved credentials actually work. */
    public String sendTest(Organization organization, TestSendNotificationRequest request) {
        NotificationChannel channel;
        try {
            channel = NotificationChannel.valueOf(request.channel().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown channel: " + request.channel());
        }
        if (channel == NotificationChannel.IN_APP) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "In-app notifications don't need a test send.");
        }
        ChannelSendResult result = notificationService.sendTest(organization, channel, request.destination());
        if (!result.success()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    result.errorMessage() != null ? result.errorMessage() : "Test message could not be delivered.");
        }
        return "Test message sent via " + channel.name() + ".";
    }

    private String orDefault(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }

    private OrganizationCommunicationSettingsDto toDto(OrganizationCommunicationSettings s) {
        return new OrganizationCommunicationSettingsDto(
                s.isEmailEnabled(), s.getEmailProvider(), secretJsonConfig.redacted(s.getEmailConfigJson(), "password"),
                secretJsonConfig.isConfigured(s.getEmailConfigJson(), "password"),
                s.isSmsEnabled(), s.getSmsProvider(), secretJsonConfig.redacted(s.getSmsConfigJson(), "apiSecret"),
                secretJsonConfig.isConfigured(s.getSmsConfigJson(), "apiSecret"),
                s.isWhatsappEnabled(), s.getWhatsappProvider(), secretJsonConfig.redacted(s.getWhatsappConfigJson(), "apiKey"),
                secretJsonConfig.isConfigured(s.getWhatsappConfigJson(), "apiKey"),
                s.isInAppEnabled());
    }
}
