package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.OrganizationDto;
import com.MediUnivers.service.dto.OrganizationSettingsDto;
import com.MediUnivers.service.dto.UpdateOrganizationProfileRequest;
import com.MediUnivers.service.dto.UpdateOrganizationSettingsRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** The Org Owner/Admin's self-service view of their own organization (spec §36, "current"). */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class OrganizationProfileController {

    private final OrganizationService organizationService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/org/profile")
    public OrganizationDto getProfile() {
        return organizationService.getProfile(requireOrgUser().getOrganization());
    }

    @PutMapping("/api/org/profile")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public OrganizationDto updateProfile(@Valid @RequestBody UpdateOrganizationProfileRequest request) {
        return organizationService.updateProfile(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/api/org/settings")
    public OrganizationSettingsDto getSettings() {
        return organizationService.getSettings(requireOrgUser().getOrganization());
    }

    @PutMapping("/api/org/settings")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public OrganizationSettingsDto updateSettings(@Valid @RequestBody UpdateOrganizationSettingsRequest request) {
        return organizationService.updateSettings(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
