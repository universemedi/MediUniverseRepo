package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CollectSampleRequest(@NotBlank String sampleTypes, String remarks) {
}
