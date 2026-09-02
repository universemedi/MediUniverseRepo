package com.MediUnivers.service.notification;

import com.MediUnivers.service.domain.NotificationChannel;
import com.MediUnivers.service.domain.PlatformCommunicationSettings;
import com.MediUnivers.service.domain.PlatformNotification;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.util.Properties;

/** SMTP delivery using MediUnivers' own credentials — {@link EmailChannelSender}'s platform-scoped twin. */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformEmailChannelSender implements PlatformNotificationChannelSender {

    private final ObjectMapper objectMapper;

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public ChannelSendResult send(PlatformCommunicationSettings settings, PlatformNotification notification) {
        if (notification.getRecipientEmail() == null || notification.getRecipientEmail().isBlank()) {
            return ChannelSendResult.failed("No recipient email address on file.");
        }
        JsonNode config = parseConfig(settings.getEmailConfigJson());
        String host = text(config, "host");
        if (host == null || host.isBlank()) {
            log.info("[PLATFORM EMAIL:not configured] to={} subject={} body={}",
                    notification.getRecipientEmail(), notification.getSubject(), notification.getBody());
            return ChannelSendResult.failed("Platform email isn't configured yet (missing SMTP host).");
        }

        try {
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(host);
            mailSender.setPort(intOrDefault(config, "port", 587));
            String username = text(config, "username");
            String password = text(config, "password");
            if (username != null) mailSender.setUsername(username);
            if (password != null) mailSender.setPassword(password);

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", username != null && !username.isBlank());
            applyTlsMode(props, config);
            props.put("mail.smtp.connectiontimeout", String.valueOf(intOrDefault(config, "connectionTimeoutMs", 10000)));
            props.put("mail.smtp.timeout", String.valueOf(intOrDefault(config, "readTimeoutMs", 10000)));
            props.put("mail.smtp.writetimeout", String.valueOf(intOrDefault(config, "writeTimeoutMs", 10000)));

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            String fromEmail = textOrDefault(config, "fromEmail", username);
            String fromName = text(config, "fromName");
            helper.setFrom(fromName != null && !fromName.isBlank() ? fromName + " <" + fromEmail + ">" : fromEmail);
            helper.setTo(notification.getRecipientEmail());
            String replyTo = text(config, "replyTo");
            if (replyTo != null && !replyTo.isBlank()) helper.setReplyTo(replyTo);
            helper.setSubject(notification.getSubject() != null ? notification.getSubject() : "");
            helper.setText(notification.getBody(), false);

            mailSender.send(message);
            return ChannelSendResult.ok();
        } catch (Exception ex) {
            log.warn("Platform email delivery failed for notification {}: {}", notification.getId(), ex.getMessage());
            return ChannelSendResult.failed(ex.getMessage() != null ? ex.getMessage() : "Email delivery failed.");
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

    private String textOrDefault(JsonNode node, String field, String fallback) {
        String v = text(node, field);
        return v != null && !v.isBlank() ? v : fallback;
    }

    private int intOrDefault(JsonNode node, String field, int fallback) {
        JsonNode v = node.get(field);
        return v != null && v.canConvertToInt() ? v.asInt() : fallback;
    }

    private boolean boolOrDefault(JsonNode node, String field, boolean fallback) {
        JsonNode v = node.get(field);
        return v != null && !v.isNull() ? v.asBoolean() : fallback;
    }

    /** "tlsMode": NONE / STARTTLS / SSL — falls back to the older boolean "useTls" (true -> STARTTLS) when absent. */
    private void applyTlsMode(Properties props, JsonNode config) {
        String mode = textOrDefault(config, "tlsMode", boolOrDefault(config, "useTls", true) ? "STARTTLS" : "NONE");
        boolean ssl = "SSL".equalsIgnoreCase(mode);
        boolean startTls = "STARTTLS".equalsIgnoreCase(mode);
        props.put("mail.smtp.ssl.enable", String.valueOf(ssl));
        props.put("mail.smtp.starttls.enable", String.valueOf(startTls));
    }
}
