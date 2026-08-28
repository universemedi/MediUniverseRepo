package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class DtoMapper {

    private DtoMapper() {
    }

    public static OrgTypeDto toDto(OrgType t) {
        return new OrgTypeDto(t.getId(), t.getCode(), t.getName(), t.getDescription(), t.getModules());
    }

    public static PlanDto toDto(Plan p) {
        return new PlanDto(p.getId(), p.getCode(), p.getName(), p.getPriceLabel(), p.getTagline(),
                p.getMaxBranches(), p.getMaxUsers(), p.getStorageLabel(), p.getModules(), p.getHighlights());
    }

    public static BranchDto toDto(Branch b) {
        List<String> modules = b.getEnabledModules().stream()
                .map(Enum::name).map(String::toLowerCase).sorted().collect(Collectors.toList());
        return new BranchDto(b.getId(), b.getName(), b.isHeadOffice(), b.getStatus().name(), modules,
                b.getEmail(), b.getPhone(), b.getCity());
    }

    public static RoleDto toDto(Role r) {
        Map<String, Object> access = new LinkedHashMap<>();
        for (RoleGroupAccess a : r.getGroupAccess()) {
            access.put(a.getModuleGroup().name().toLowerCase(),
                    a.isWildcard() ? "*" : List.copyOf(a.getPaths()));
        }
        return new RoleDto(r.getId(), r.getCode(), r.getName(), r.getPortal(), r.getDescription(),
                r.isSystem(), r.getOrganization() != null ? r.getOrganization().getId() : null,
                r.getActions(), access);
    }

    public static OrganizationDto toDto(Organization o, List<Branch> branches) {
        return new OrganizationDto(o.getId(), o.getOrganizationCode(), o.getSlug(), o.getName(), o.getSubdomain(),
                toDto(o.getOrgType()), toDto(o.getPlan()), o.getStatus(), o.getCreationSource().name(), o.getRenewsOn(),
                branches.stream().map(DtoMapper::toDto).collect(Collectors.toList()),
                o.getEmail(), o.getPhone(), o.getAddressLine1(), o.getAddressLine2(), o.getCity(), o.getState(),
                o.getCountry(), o.getPostalCode(), o.getTimezone(), o.getCurrency(), o.getLanguage(),
                o.getGstNumber(), o.getRegistrationNumber(), o.getWebsite(), o.getLogoUrl());
    }
}
