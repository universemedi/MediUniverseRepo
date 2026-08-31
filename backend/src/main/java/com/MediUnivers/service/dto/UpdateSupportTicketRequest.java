package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.TicketPriority;
import com.MediUnivers.service.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateSupportTicketRequest(
        @NotNull TicketPriority priority,
        Long ownerId,
        @NotNull TicketStatus status
) {
}
