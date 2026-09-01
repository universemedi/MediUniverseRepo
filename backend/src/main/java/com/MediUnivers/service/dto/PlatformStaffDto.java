package com.MediUnivers.service.dto;

public record PlatformStaffDto(
        Long id, String fullName, String email, String phone, String roleCode, String roleName, String status
) {
}
