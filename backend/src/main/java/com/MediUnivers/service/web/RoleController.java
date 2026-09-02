package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.Portal;
import com.MediUnivers.service.dto.CreateRoleRequest;
import com.MediUnivers.service.dto.RoleDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;
    private final CurrentUserService currentUserService;

    /** System roles for a portal — used to populate the login screen and admin pickers. */
    @GetMapping("/api/public/roles")
    public List<RoleDto> listSystemRoles(@RequestParam("portal") String portal) {
        return roleService.listForPortal(Portal.valueOf(portal.toUpperCase()));
    }

    /** System roles + this organization's own custom roles. */
    @GetMapping("/api/org/roles")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<RoleDto> listOrgRoles() {
        AppUser me = currentUserService.require();
        requireOrganization(me);
        return roleService.listForOrganization(me.getOrganization().getId());
    }

    /**
     * Org Owner / Org Admin builds a custom role. Every module group they grant
     * must be part of what their organization's business type actually runs
     * (enforced in RoleService against the org's OrgType — not just the plan).
     */
    @PostMapping("/api/org/roles")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public RoleDto createOrgRole(@Valid @RequestBody CreateRoleRequest request) {
        AppUser me = currentUserService.require();
        requireOrganization(me);
        return roleService.createCustomRole(me.getOrganization(), request);
    }

    /** Org Owner/Admin edits their own organization's custom role. */
    @PutMapping("/api/org/roles/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public RoleDto updateOrgRole(@PathVariable Long id, @Valid @RequestBody CreateRoleRequest request) {
        AppUser me = currentUserService.require();
        requireOrganization(me);
        return roleService.updateOrgRole(me.getOrganization(), id, request);
    }

    @DeleteMapping("/api/org/roles/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOrgRole(@PathVariable Long id) {
        AppUser me = currentUserService.require();
        requireOrganization(me);
        roleService.deleteOrgRole(me.getOrganization(), id);
    }

    /** Super Admin builds a brand-new platform-portal role (staff role, not tenant). */
    @PostMapping("/api/platform/roles")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public RoleDto createPlatformRole(@Valid @RequestBody CreateRoleRequest request) {
        return roleService.createPlatformRole(request);
    }

    /** Edits any non-system role (a platform role created here, or an org's own custom role). */
    @PutMapping("/api/platform/roles/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    public RoleDto updateRole(@PathVariable Long id, @Valid @RequestBody CreateRoleRequest request) {
        return roleService.updateRole(id, request);
    }

    @DeleteMapping("/api/platform/roles/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and hasAuthority('ROLE_SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
    }

    private void requireOrganization(AppUser me) {
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
    }
}
