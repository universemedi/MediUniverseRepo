package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record AddLeadNoteRequest(@NotBlank String note) {
}
