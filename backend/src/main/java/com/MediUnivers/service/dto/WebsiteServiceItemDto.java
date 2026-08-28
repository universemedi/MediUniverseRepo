package com.MediUnivers.service.dto;

public record WebsiteServiceItemDto(Long id, String name, String description, String iconName, int sortOrder, boolean active) {
}
