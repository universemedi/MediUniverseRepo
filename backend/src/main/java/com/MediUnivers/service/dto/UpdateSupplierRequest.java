package com.MediUnivers.service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateSupplierRequest(
        @NotBlank String name, String contactName, String phone, String email, String address,
        String gstNumber, String status
) {
}
