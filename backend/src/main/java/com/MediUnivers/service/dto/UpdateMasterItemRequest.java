package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

/** Shared update shape for the simple org-editable master lists (specializations, medicine categories/units, manufacturers) — all share the same name+status shape as Department. */
public record UpdateMasterItemRequest(@NotBlank String name, String status) {
}
