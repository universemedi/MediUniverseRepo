package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.ModulePriceDto;
import com.MediUnivers.service.dto.UpdateModulePriceRequest;
import com.MediUnivers.service.service.ModulePriceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Per-module pricing for the "build your own plan" option — browsing is public (needed on the signup site), editing is super-admin only, same restriction as Plan CRUD. */
@RestController
@RequiredArgsConstructor
public class ModulePriceController {

    private final ModulePriceService modulePriceService;

    @GetMapping("/api/public/module-prices")
    public List<ModulePriceDto> listPublic() {
        return modulePriceService.listActive();
    }

    @GetMapping("/api/platform/module-prices")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
    public List<ModulePriceDto> listAdmin() {
        return modulePriceService.listAllForAdmin();
    }

    @PutMapping("/api/platform/module-prices/{moduleGroup}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public ModulePriceDto update(@PathVariable String moduleGroup, @Valid @RequestBody UpdateModulePriceRequest request) {
        return modulePriceService.update(moduleGroup, request);
    }
}
