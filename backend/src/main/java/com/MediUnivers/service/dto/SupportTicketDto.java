package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.TicketPriority;
import com.MediUnivers.service.domain.TicketStatus;

import java.time.Instant;

public record SupportTicketDto(Long id, String code, String subject, Long organizationId, String organizationName,
                                TicketPriority priority, Long ownerId, String ownerName,
                                TicketStatus status, Instant createdAt) {
}
