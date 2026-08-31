package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSupportTicketRequest(
        @NotBlank String subject,
        Long organizationId,
        @NotNull TicketPriority priority,
        Long ownerId
) {
}
