package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.OrgStatus;

import java.time.LocalDate;
import java.util.List;

public record OrganizationDto(
        Long id,
        String organizationCode,
        String slug,
        String name,
        String subdomain,
        OrgTypeDto orgType,
        PlanDto plan,
        OrgStatus status,
        String creationSource,
        LocalDate renewsOn,
        List<BranchDto> branches,
        String email,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String country,
        String postalCode,
        String timezone,
        String currency,
        String language,
        String gstNumber,
        String registrationNumber,
        String website,
        String logoUrl
) {
}
