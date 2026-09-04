package com.MediUnivers.service.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record GoodsReceiptDto(
        Long id, String grnNumber, String supplierName, String branchName, String poNumber,
        String supplierInvoiceNumber, LocalDate supplierInvoiceDate, String status, Instant receivedAt,
        List<GoodsReceiptItemDto> items
) {
}
