package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.AddonPricingDto;
import com.MediUnivers.service.dto.UpdateAddonPricingRequest;
import com.MediUnivers.service.service.AddonPricingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Addon rates — browsing is public (needed at checkout), editing is super-admin only, same restriction as Plan/ModulePrice CRUD. */
@RestController
@RequiredArgsConstructor
public class AddonPricingController {

    private final AddonPricingService addonPricingService;

    @GetMapping("/api/public/addon-pricing")
    public List<AddonPricingDto> listPublic() {
        return addonPricingService.listActive();
    }

    @GetMapping("/api/platform/addon-pricing")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
    public List<AddonPricingDto> listAdmin() {
        return addonPricingService.listAllForAdmin();
    }

    @PutMapping("/api/platform/addon-pricing/{addonType}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public AddonPricingDto update(@PathVariable String addonType, @Valid @RequestBody UpdateAddonPricingRequest request) {
        return addonPricingService.update(addonType, request);
    }
}
