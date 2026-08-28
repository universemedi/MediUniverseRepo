package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSupplierRequest(@NotBlank String name, String contactName, String phone, String email, String address, String gstNumber) {
}
