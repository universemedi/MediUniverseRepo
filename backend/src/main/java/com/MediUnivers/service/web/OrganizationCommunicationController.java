package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.OrganizationCommunicationSettingsDto;
import com.MediUnivers.service.dto.TestSendNotificationRequest;
import com.MediUnivers.service.dto.UpdateOrganizationCommunicationSettingsRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OrganizationCommunicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * "Communication type (Email/SMS/WhatsApp) configurable from the
 * organization dashboard" — this is that screen's API. Org Owner/Admin
 * toggle channels on/off and enter their own provider credentials; any org
 * user can read the current state (e.g. so a form knows what's enabled).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/communication")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class OrganizationCommunicationController {

    private final OrganizationCommunicationService communicationService;
    private final CurrentUserService currentUserService;

    @GetMapping("/settings")
    public OrganizationCommunicationSettingsDto getSettings() {
        return communicationService.getSettings(requireOrgUser().getOrganization());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public OrganizationCommunicationSettingsDto updateSettings(@Valid @RequestBody UpdateOrganizationCommunicationSettingsRequest request) {
        return communicationService.updateSettings(requireOrgUser().getOrganization(), request);
    }

    @PostMapping("/test-send")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public Map<String, String> testSend(@Valid @RequestBody TestSendNotificationRequest request) {
        return Map.of("message", communicationService.sendTest(requireOrgUser().getOrganization(), request));
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
