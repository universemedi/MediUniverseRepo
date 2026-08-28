package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.Portal;

public record MeResponse(
        Long userId,
        String name,
        String email,
        Portal portal,
        RoleDto role,
        OrganizationDto organization,
        String branchName,
        Long branchId
) {
}
