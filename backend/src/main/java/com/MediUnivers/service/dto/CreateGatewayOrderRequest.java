package com.MediUnivers.service.dto;

/** gateway defaults to "razorpay" if omitted — pass a different bean name once another gateway is registered. */
public record CreateGatewayOrderRequest(String gateway) {
}
