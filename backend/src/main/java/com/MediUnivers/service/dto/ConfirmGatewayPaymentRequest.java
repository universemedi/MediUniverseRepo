package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmGatewayPaymentRequest(
        String gateway,
        @NotBlank String gatewayOrderId,
        @NotBlank String gatewayPaymentId,
        @NotBlank String signature
) {
}
