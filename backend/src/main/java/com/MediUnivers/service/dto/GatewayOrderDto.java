package com.MediUnivers.service.dto;

import java.math.BigDecimal;

public record GatewayOrderDto(
        Long invoiceId, String gateway, String gatewayOrderId, BigDecimal amount, String currency,
        String publicKey, boolean mock,
        /** Credit applied from the unused portion of the org's current plan, if this is a
         * mid-cycle upgrade — zero everywhere else (new signup, invoice payment). */
        BigDecimal proratedCredit
) {
}
