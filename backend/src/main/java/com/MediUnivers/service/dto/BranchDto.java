package com.MediUnivers.service.dto;

import java.util.List;

public record BranchDto(
        Long id, String name, boolean headOffice, String status, List<String> enabledModules,
        String email, String phone, String city, String businessHoursJson
) {
}
