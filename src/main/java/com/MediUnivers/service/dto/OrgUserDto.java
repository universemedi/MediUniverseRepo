package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.UserStatus;

public record OrgUserDto(
        Long id,
        String fullName,
        String email,
        String roleCode,
        String roleName,
        Long branchId,
        String branchName,
        UserStatus status
) {
}
