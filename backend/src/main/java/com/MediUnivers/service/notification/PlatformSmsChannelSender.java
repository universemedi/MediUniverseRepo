package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformCommunicationSettings;
import com.MediUnivers.service.domain.PlatformNotification;
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
 * SMS delivery for MediUnivers' own account-security texts — {@link SmsChannelSender}'s
 * platform-scoped twin. Same "Local Gateway" stand-in as the org-side sender: with no
 * apiUrl configured, the message is logged instead of sent, which is enough until a
 * real provider (Twilio/MSG91) is plugged in via Platform Communication Settings.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformSmsChannelSender implements PlatformNotificationChannelSender {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.SMS;
    }

    @Override
    public ChannelSendResult send(PlatformCommunicationSettings settings, PlatformNotification notification) {
        if (notification.getRecipientPhone() == null || notification.getRecipientPhone().isBlank()) {
            return ChannelSendResult.failed("No recipient phone number on file.");
        }
        JsonNode config = parseConfig(settings.getSmsConfigJson());
        String apiUrl = text(config, "apiUrl");
        if (apiUrl == null || apiUrl.isBlank()) {
            log.info("[PLATFORM SMS:local-gateway] to={} body={}", notification.getRecipientPhone(), notification.getBody());
            return ChannelSendResult.ok();
        }

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "to", notification.getRecipientPhone(),
                    "message", notification.getBody(),
                    "senderId", text(config, "senderId") != null ? text(config, "senderId") : ""));

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
            return ChannelSendResult.failed("SMS gateway returned HTTP " + response.statusCode());
        } catch (Exception ex) {
            log.warn("Platform SMS delivery failed for notification {}: {}", notification.getId(), ex.getMessage());
            return ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "SMS delivery failed.");
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
