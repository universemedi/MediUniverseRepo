package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.CreateLabPackageRequest;
import com.MediUnivers.service.dto.LabPackageDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.LabPackageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lab/packages")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class LabPackageController {

    private final LabPackageService service;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<LabPackageDto> list() {
        return service.list(requireOrgUser().getOrganization());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabPackageDto create(@Valid @RequestBody CreateLabPackageRequest request) {
        return service.create(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
