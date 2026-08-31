package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreatePlatformModuleRequest;
import com.MediUnivers.service.dto.PlatformModuleDto;
import com.MediUnivers.service.dto.UpdatePlatformModuleRequest;
import com.MediUnivers.service.service.PlatformModuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Marketing-facing module catalog — super admin only, mirrors Plan/OrgType CRUD. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/modules")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformModuleController {

    private final PlatformModuleService service;

    @GetMapping
    public List<PlatformModuleDto> list() {
        return service.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformModuleDto create(@Valid @RequestBody CreatePlatformModuleRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformModuleDto update(@PathVariable Long id, @Valid @RequestBody UpdatePlatformModuleRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        service.deactivate(id);
    }
}
