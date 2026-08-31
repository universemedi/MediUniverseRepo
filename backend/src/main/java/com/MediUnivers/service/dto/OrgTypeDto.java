package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;

import java.util.Set;

public record OrgTypeDto(Long id, String code, String name, String description, Set<ModuleGroup> modules, boolean active) {
}
