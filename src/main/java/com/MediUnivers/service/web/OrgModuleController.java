package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.OrgModuleStatusDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OrgModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * The Org Owner's "Configure Modules" screen: which business modules
 * (Doctor/Clinic, Pharmacy, Laboratory, CRM, Website) are available for this
 * organization right now, and why — not part of the org's business type, not
 * covered by the current subscription, or fully enabled and ready to staff.
 */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class OrgModuleController {

    private final OrgModuleService orgModuleService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/org/modules")
    public List<OrgModuleStatusDto> myOrganizationModules() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return orgModuleService.statusFor(me.getOrganization());
    }
}
