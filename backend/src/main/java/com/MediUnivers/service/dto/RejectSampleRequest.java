package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectSampleRequest(@NotBlank String reason) {
}
