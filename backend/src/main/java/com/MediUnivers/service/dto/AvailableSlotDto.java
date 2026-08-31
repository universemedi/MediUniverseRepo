package com.MediUnivers.service.dto;

import java.time.LocalTime;

public record AvailableSlotDto(LocalTime time, boolean available) {
}
