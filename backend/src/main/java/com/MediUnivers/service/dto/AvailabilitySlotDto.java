package com.MediUnivers.service.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record AvailabilitySlotDto(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, int slotMinutes) {
}
