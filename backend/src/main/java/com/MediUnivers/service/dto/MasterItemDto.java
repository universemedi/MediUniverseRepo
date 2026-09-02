package com.MediUnivers.service.dto;

/** Generic shape for the smaller master-data lists (medicine categories, units, manufacturers). */
public record MasterItemDto(Long id, String code, String name, String status, boolean platformDefault) {
}
