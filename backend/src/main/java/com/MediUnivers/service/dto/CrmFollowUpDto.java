package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record CrmFollowUpDto(Long id, Long leadId, String leadName, String type, Long ownerId, String ownerName,
                              LocalDate dueDate, String notes, String status) {
}
