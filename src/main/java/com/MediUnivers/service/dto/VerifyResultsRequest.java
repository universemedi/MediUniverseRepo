package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record VerifyResultsRequest(@NotEmpty List<Long> orderItemIds) {
}
