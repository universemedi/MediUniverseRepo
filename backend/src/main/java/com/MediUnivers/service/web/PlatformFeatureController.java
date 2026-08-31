package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreatePlatformFeatureRequest;
import com.MediUnivers.service.dto.PlatformFeatureDto;
import com.MediUnivers.service.dto.UpdatePlatformFeatureRequest;
import com.MediUnivers.service.service.PlatformFeatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Granular feature flags per module — super admin only, mirrors Plan/OrgType CRUD. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/features")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformFeatureController {

    private final PlatformFeatureService service;

    @GetMapping
    public List<PlatformFeatureDto> list() {
        return service.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformFeatureDto create(@Valid @RequestBody CreatePlatformFeatureRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformFeatureDto update(@PathVariable Long id, @Valid @RequestBody UpdatePlatformFeatureRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        service.deactivate(id);
    }
}
