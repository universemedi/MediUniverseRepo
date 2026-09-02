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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * SMS delivery (spec §24). Twilio gets its own branch below since its API
 * shape (Basic Auth, form-encoded body, account-derived URL) is fixed and
 * well documented enough to implement directly. Everything else posts a
 * generic JSON payload {to, message, senderId} to whatever apiUrl the
 * organization configures — most Indian SMS gateways accept that shape,
 * though a provider with its own fixed request shape (MSG91's newer APIs
 * included) may need a small proxy in front of it. An org that leaves apiUrl
 * blank (and isn't on Twilio) gets the "Local Gateway" behaviour: the
 * message is logged instead of actually sent, enough to develop and demo the
 * rest of the flow without a live account.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SmsChannelSender implements NotificationChannelSender {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.SMS;
    }

    @Override
    public ChannelSendResult send(OrganizationCommunicationSettings settings, Notification notification) {
        if (notification.getRecipientPhone() == null || notification.getRecipientPhone().isBlank()) {
            return ChannelSendResult.failed("No recipient phone number on file.");
        }
        JsonNode config = parseConfig(settings.getSmsConfigJson());

        if ("TWILIO".equalsIgnoreCase(settings.getSmsProvider())) {
            return sendViaTwilio(config, notification);
        }

        String apiUrl = text(config, "apiUrl");
        if (apiUrl == null || apiUrl.isBlank()) {
            log.info("[SMS:local-gateway] to={} body={}", notification.getRecipientPhone(), notification.getBody());
            return ChannelSendResult.ok(); // Local Gateway == simulated delivery, treated as sent.
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
            log.warn("SMS delivery failed for notification {}: {}", notification.getId(), ex.getMessage());
            return ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "SMS delivery failed.");
        }
    }

    /** Account SID goes in {@code apiKey}, Auth Token in {@code apiSecret}, the Twilio-verified
     * "From" number in {@code senderId} — the endpoint itself is derived from the Account SID,
     * not a configurable apiUrl, since Twilio's REST API only has the one fixed shape. */
    private ChannelSendResult sendViaTwilio(JsonNode config, Notification notification) {
        String accountSid = text(config, "apiKey");
        String authToken = text(config, "apiSecret");
        String fromNumber = text(config, "senderId");
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()
                || fromNumber == null || fromNumber.isBlank()) {
            return ChannelSendResult.failed("Twilio isn't fully configured yet (Account SID, Auth Token and From number are all required).");
        }

        try {
            String body = "To=" + URLEncoder.encode(notification.getRecipientPhone(), StandardCharsets.UTF_8)
                    + "&From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8)
                    + "&Body=" + URLEncoder.encode(notification.getBody(), StandardCharsets.UTF_8);
            String credentials = Base64.getEncoder().encodeToString(
                    (accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("Authorization", "Basic " + credentials)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return ChannelSendResult.ok();
            }
            return ChannelSendResult.failed("Twilio returned HTTP " + response.statusCode() + ": " + response.body());
        } catch (Exception ex) {
            log.warn("Twilio SMS delivery failed: {}", ex.getMessage());
            return ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "Twilio delivery failed.");
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
