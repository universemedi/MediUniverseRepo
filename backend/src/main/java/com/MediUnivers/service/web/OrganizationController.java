package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.OrgStatus;
import com.MediUnivers.service.dto.CreateOrganizationRequest;
import com.MediUnivers.service.dto.OrganizationDto;
import com.MediUnivers.service.dto.UpdateOrganizationProfileRequest;
import com.MediUnivers.service.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/organizations")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM')")
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public List<OrganizationDto> list() {
        return organizationService.listAll();
    }

    @GetMapping("/{id}")
    public OrganizationDto get(@PathVariable Long id) {
        return organizationService.getById(id);
    }

    /**
     * The one call that turns a won deal into a working tenant: pick an
     * Organization Type + a Plan, and it creates the organization, its head
     * branch and an Org Owner login in one shot — this is the "Payment ->
     * Organization Automatically Created -> Owner Receives Login Details"
     * step from the business flow.
     */
    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD'))")
    public OrganizationDto create(@Valid @RequestBody CreateOrganizationRequest request) {
        return organizationService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD'))")
    public OrganizationDto update(@PathVariable Long id, @Valid @RequestBody UpdateOrganizationProfileRequest request) {
        return organizationService.updatePlatformProfile(id, request);
    }

    @PutMapping("/{id}/plan")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    public OrganizationDto changePlan(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return organizationService.changePlan(id, body.get("planCode"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_FINANCE'))")
    public OrganizationDto changeStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return organizationService.changeStatus(id, OrgStatus.valueOf(body.get("status")));
    }
}
