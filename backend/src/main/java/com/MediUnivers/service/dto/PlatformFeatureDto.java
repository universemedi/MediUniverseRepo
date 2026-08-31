package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;

public record PlatformFeatureDto(Long id, String code, String name, ModuleGroup moduleGroup, String featureType, boolean active) {
}
