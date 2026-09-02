package com.MediUnivers.service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Every provider config on the Communication Engine (email/SMS/WhatsApp, org- and
 * platform-scoped alike) is a small opaque JSON blob with one credential field
 * inside it (password / apiSecret / apiKey). Two rules apply everywhere that blob
 * is read or written, so they live here once instead of being reimplemented per
 * channel: never send the real secret back to the browser (redact it, and tell the
 * frontend only whether one is configured), and never let a save with a blank
 * secret field silently wipe out the one already stored — the frontend can't
 * resubmit a value it was never given back.
 */
@Component
@RequiredArgsConstructor
public class SecretJsonConfig {

    private final ObjectMapper objectMapper;

    public boolean isConfigured(String json, String secretKey) {
        String value = readSecret(json, secretKey);
        return value != null && !value.isBlank();
    }

    /** True if ANY of the given keys currently holds a value — e.g. a provider whose one credential field changes name. */
    public boolean isAnyConfigured(String json, String... secretKeys) {
        for (String key : secretKeys) {
            if (isConfigured(json, key)) return true;
        }
        return false;
    }

    /** Safe to send to the frontend: the secret field is blanked, everything else is untouched. */
    public String redacted(String json, String secretKey) {
        return redacted(json, new String[] { secretKey });
    }

    /** Same, for a config whose sensitive value can live under different keys depending on the selected provider. */
    public String redacted(String json, String... secretKeys) {
        if (json == null || json.isBlank()) return json;
        ObjectNode node = readObject(json);
        if (node == null) return json;
        for (String key : secretKeys) {
            if (node.has(key)) node.put(key, "");
        }
        return write(node, json);
    }

    /** If the incoming save has a blank secret, carries over whatever is already stored instead of erasing it. */
    public String preserveSecretIfBlank(String existingJson, String incomingJson, String secretKey) {
        return preserveSecretIfBlank(existingJson, incomingJson, new String[] { secretKey });
    }

    /** Same, for a config whose sensitive value can live under different keys depending on the selected provider. */
    public String preserveSecretIfBlank(String existingJson, String incomingJson, String... secretKeys) {
        if (incomingJson == null) return null;
        ObjectNode incoming = readObject(incomingJson);
        if (incoming == null) return incomingJson;
        for (String secretKey : secretKeys) {
            JsonNode incomingValue = incoming.get(secretKey);
            boolean incomingBlank = incomingValue == null || incomingValue.isNull() || incomingValue.asText().isBlank();
            if (incomingBlank) {
                String existingSecret = readSecret(existingJson, secretKey);
                if (existingSecret != null && !existingSecret.isBlank()) {
                    incoming.put(secretKey, existingSecret);
                }
            }
        }
        return write(incoming, incomingJson);
    }

    private String readSecret(String json, String secretKey) {
        ObjectNode node = readObject(json);
        if (node == null) return null;
        JsonNode value = node.get(secretKey);
        return value != null && !value.isNull() ? value.asText() : null;
    }

    private ObjectNode readObject(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode node = objectMapper.readTree(json);
            return node instanceof ObjectNode on ? on : null;
        } catch (Exception ex) {
            return null;
        }
    }

    private String write(ObjectNode node, String fallback) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception ex) {
            return fallback;
        }
    }
}
