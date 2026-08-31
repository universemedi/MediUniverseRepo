package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreatePlatformStaffRequest;
import com.MediUnivers.service.dto.PlatformStaffDto;
import com.MediUnivers.service.dto.UpdatePlatformStaffRequest;
import com.MediUnivers.service.service.PlatformStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** MediUnivers staff (org == null) — used to populate "assign to" pickers, e.g. on the lead pipeline, and the platform/users admin screen. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/staff")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformStaffController {

    private final PlatformStaffService service;

    @GetMapping
    public List<PlatformStaffDto> list() {
        return service.listAll();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformStaffDto create(@Valid @RequestBody CreatePlatformStaffRequest request) {
        return service.invite(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public PlatformStaffDto update(@PathVariable Long id, @Valid @RequestBody UpdatePlatformStaffRequest request) {
        return service.update(id, request);
    }
}
