package com.MediUnivers.service.dto;

import java.time.LocalDate;

public record ExpiringOrganizationDto(Long id, String name, String planName, LocalDate renewsOn, long daysLeft) {
}
