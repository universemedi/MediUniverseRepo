package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.BranchDto;
import com.MediUnivers.service.dto.CreateBranchRequest;
import com.MediUnivers.service.dto.UpdateBranchRequest;
import com.MediUnivers.service.dto.UpdateBranchStatusRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/branches")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class BranchController {

    private final OrganizationService organizationService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<BranchDto> list() {
        return organizationService.listBranches(requireOrgUser().getOrganization());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public BranchDto create(@Valid @RequestBody CreateBranchRequest request) {
        return organizationService.createBranch(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public BranchDto update(@PathVariable Long id, @Valid @RequestBody UpdateBranchRequest request) {
        return organizationService.updateBranch(requireOrgUser().getOrganization(), id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN'))")
    public BranchDto updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateBranchStatusRequest request) {
        return organizationService.updateBranchStatus(requireOrgUser().getOrganization(), id, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
