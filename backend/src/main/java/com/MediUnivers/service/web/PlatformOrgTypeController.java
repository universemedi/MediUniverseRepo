package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.CreateOrgTypeRequest;
import com.MediUnivers.service.dto.OrgTypeDto;
import com.MediUnivers.service.dto.UpdateOrgTypeRequest;
import com.MediUnivers.service.service.OrgTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Organization type catalog management — super admin only, same restriction as Plan CRUD. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/organization-types")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class PlatformOrgTypeController {

    private final OrgTypeService orgTypeService;

    @GetMapping
    public List<OrgTypeDto> list() {
        return orgTypeService.listAllForAdmin();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public OrgTypeDto create(@Valid @RequestBody CreateOrgTypeRequest request) {
        return orgTypeService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public OrgTypeDto update(@PathVariable Long id, @Valid @RequestBody UpdateOrgTypeRequest request) {
        return orgTypeService.update(id, request);
    }

    /** Real delete — rejected while any organization still uses this type; deactivate it from the edit dialog instead. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        orgTypeService.delete(id);
    }
}
