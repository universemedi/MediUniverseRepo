package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.PlatformDashboardDto;
import com.MediUnivers.service.service.PlatformDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformDashboardController {

    private final PlatformDashboardService dashboardService;

    @GetMapping("/api/platform/dashboard")
    public PlatformDashboardDto dashboard() {
        return dashboardService.dashboard();
    }
}
