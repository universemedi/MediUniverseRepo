package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

/** channel: EMAIL | SMS | WHATSAPP. destination: an email address or a phone number, matching the channel. */
public record TestSendNotificationRequest(
        @NotBlank String channel,
        @NotBlank String destination
) {
}
