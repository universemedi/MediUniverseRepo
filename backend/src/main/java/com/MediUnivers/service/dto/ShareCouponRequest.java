package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ShareCouponRequest(
        @NotBlank(message = "Recipient name is required") String recipientName,
        @NotBlank @Email(message = "A valid recipient email is required") String recipientEmail
) {
}
