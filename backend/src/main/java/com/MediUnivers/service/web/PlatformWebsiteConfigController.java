package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.PlatformWebsiteConfigDto;
import com.MediUnivers.service.dto.UpdatePlatformWebsiteConfigRequest;
import com.MediUnivers.service.service.PlatformWebsiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** MediUnivers' own site — real backend for the platform/cms screen (req #9), gated to the roles DataSeeder already seeds with platform/cms access. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/website-config")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_MARKETING'))")
public class PlatformWebsiteConfigController {

    private final PlatformWebsiteService platformWebsiteService;

    @GetMapping
    public PlatformWebsiteConfigDto getConfig() {
        return platformWebsiteService.getConfig();
    }

    @PutMapping
    public PlatformWebsiteConfigDto updateConfig(@Valid @RequestBody UpdatePlatformWebsiteConfigRequest request) {
        return platformWebsiteService.updateConfig(request);
    }
}
