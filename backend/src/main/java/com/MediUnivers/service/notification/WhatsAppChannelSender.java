package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.Notification;
import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.OrganizationCommunicationSettings;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * WhatsApp delivery (spec §4 Phase 2, brought forward per this build's
 * requirement that Email/SMS/WhatsApp all be configurable from the org
 * dashboard). Posts the WhatsApp Cloud API's text-message shape to the
 * configured apiUrl/phoneNumberId; with no apiUrl configured it logs
 * instead, same "Local Gateway" fallback as SMS.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppChannelSender implements NotificationChannelSender {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public ChannelSendResult send(OrganizationCommunicationSettings settings, Notification notification) {
        if (notification.getRecipientPhone() == null || notification.getRecipientPhone().isBlank()) {
            return ChannelSendResult.failed("No recipient phone number on file.");
        }
        JsonNode config = parseConfig(settings.getWhatsappConfigJson());
        String apiUrl = text(config, "apiUrl");
        if (apiUrl == null || apiUrl.isBlank()) {
            log.info("[WHATSAPP:local-gateway] to={} body={}", notification.getRecipientPhone(), notification.getBody());
            return ChannelSendResult.ok();
        }

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "messaging_product", "whatsapp",
                    "to", notification.getRecipientPhone(),
                    "type", "text",
                    "text", Map.of("body", notification.getBody())));

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json");
            String apiKey = text(config, "apiKey");
            if (apiKey != null && !apiKey.isBlank()) {
                requestBuilder.header("Authorization", "Bearer " + apiKey);
            }
            HttpRequest request = requestBuilder.POST(HttpRequest.BodyPublishers.ofString(payload)).build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return ChannelSendResult.ok();
            }
            return ChannelSendResult.failed("WhatsApp API returned HTTP " + response.statusCode());
        } catch (Exception ex) {
            log.warn("WhatsApp delivery failed for notification {}: {}", notification.getId(), ex.getMessage());
            return ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "WhatsApp delivery failed.");
        }
    }

    private JsonNode parseConfig(String json) {
        if (json == null || json.isBlank()) return objectMapper.createObjectNode();
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            return objectMapper.createObjectNode();
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v != null && !v.isNull() ? v.asText() : null;
    }
}
