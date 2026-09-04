package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/** One addon picked at checkout — quantity is ignored (treated as 1) for a toggle addon. */
public record AddonSelectionInput(@NotBlank String addonType, @Min(1) int quantity) {
}
