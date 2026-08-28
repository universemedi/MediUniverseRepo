package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ActionType;
import com.MediUnivers.service.domain.Portal;

import java.util.Map;
import java.util.Set;

public record RoleDto(
        Long id,
        String code,
        String name,
        Portal portal,
        String description,
        boolean system,
        Long organizationId,
        Set<ActionType> actions,
        Map<String, Object> access // moduleGroup -> "*" or list of paths, matches frontend GroupAccess shape
) {
}
