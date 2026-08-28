package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.ClinicDashboardDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class ClinicDashboardController {

    private final ClinicDashboardService dashboardService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/clinic/dashboard")
    public ClinicDashboardDto dashboard() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return dashboardService.forOrganization(me.getOrganization());
    }
}
