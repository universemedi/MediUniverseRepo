package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * batchId is optional — omit it to let the server auto-allocate FIFO across
 * available batches. taxPercent is optional too: omit it to use the
 * medicine's configured GST rate, or set it to override the rate for this
 * specific sale line — GST is configurable at the entry level, not just
 * fixed forever on the medicine master.
 */
public record SaleCartItemInput(@NotNull Long medicineId, Long batchId, int quantity, BigDecimal discount, BigDecimal taxPercent) {
}
