package com.MediUnivers.service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SubmitContactFormRequest(@NotBlank String name, @Email @NotBlank String email, String phone, @NotBlank String message) {
}
