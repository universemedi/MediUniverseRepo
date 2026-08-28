package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record SaveWebsiteServiceItemRequest(@NotBlank String name, String description, String iconName, Integer sortOrder, boolean active) {
}
