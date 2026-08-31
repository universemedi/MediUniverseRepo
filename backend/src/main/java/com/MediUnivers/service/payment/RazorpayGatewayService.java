package com.MediUnivers.service.payment;

import com.MediUnivers.service.config.RazorpayProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;


import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Razorpay implementation of {@link PaymentGatewayService}. Uses the plain
 * JDK HttpClient (no extra SDK dependency) against Razorpay's REST API
 * directly: https://razorpay.com/docs/api/orders/ and
 * https://razorpay.com/docs/payments/server-integration/php/payment-gateway/build-integration/#3-verify-payment-signature
 *
 * Configure via environment variables (see tessapplication.yml):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_ENABLED
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayGatewayService implements PaymentGatewayService {

    private static final String ORDERS_URL = "https://api.razorpay.com/v1/orders";

    private final RazorpayProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public String gatewayName() {
        return "razorpay";
    }

    @Override
    public GatewayOrderResult createOrder(BigDecimal amount, String currency, String receipt) {
        if (properties.mock()) {
            String mockOrderId = "mock_order_" + java.util.UUID.randomUUID().toString().replace("-", "");
            log.info("Razorpay mock mode is enabled — returning a synthesized order for receipt {}", receipt);
            return new GatewayOrderResult(mockOrderId, amount, currency, "mock_key", true);
        }
        if (!properties.enabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Online payments aren't configured for this deployment yet. Ask an administrator to set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.");
        }
        try {
            // Razorpay wants the amount in the smallest currency unit (paise for INR).
            long amountInSubunits = amount.movePointRight(2).longValueExact();
            String body = objectMapper.writeValueAsString(Map.of(
                    "amount", amountInSubunits,
                    "currency", currency,
                    "receipt", receipt
            ));

            HttpRequest request = HttpRequest.newBuilder(URI.create(ORDERS_URL))
                    .header("Authorization", basicAuthHeader())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Razorpay order creation failed: {} {}", response.statusCode(), response.body());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The payment gateway rejected this request. Please try again.");
            }

            JsonNode json = objectMapper.readTree(response.body());
            String gatewayOrderId = json.get("id").asText();
            return new GatewayOrderResult(gatewayOrderId, amount, currency, properties.keyId(), false);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Could not reach Razorpay", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Couldn't reach the payment gateway. Please try again.");
        }
    }

    @Override
    public boolean verifyPayment(String gatewayOrderId, String gatewayPaymentId, String signature) {
        if (properties.mock()) {
            return gatewayOrderId != null && gatewayOrderId.startsWith("mock_order_");
        }
        if (!properties.enabled() || signature == null) return false;
        try {
            String payload = gatewayOrderId + "|" + gatewayPaymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.keySecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = HexFormat.of().formatHex(computed);
            return java.security.MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Razorpay signature verification failed", e);
            return false;
        }
    }

    private String basicAuthHeader() {
        String credentials = properties.keyId() + ":" + properties.keySecret();
        return "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
    }
}
