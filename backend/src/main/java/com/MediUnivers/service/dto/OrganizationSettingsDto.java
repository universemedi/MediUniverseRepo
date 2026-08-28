package com.MediUnivers.service.dto;

public record OrganizationSettingsDto(
        String dateFormat, String timeFormat, int appointmentSlotMinutes, int appointmentBufferMinutes,
        boolean allowOverbooking, String businessHoursJson, boolean emailNotificationsEnabled, boolean smsNotificationsEnabled
) {
}
