package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.LabCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class LabCatalogController {

    private final LabCatalogService catalogService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/lab/categories")
    public List<MasterItemDto> listCategories() {
        return catalogService.listCategories(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/lab/categories")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public MasterItemDto createCategory(@Valid @RequestBody CreateMasterItemRequest request) {
        return catalogService.createCategory(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/api/lab/categories/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public MasterItemDto updateCategory(@PathVariable Long id, @Valid @RequestBody UpdateMasterItemRequest request) {
        return catalogService.updateCategory(requireOrgUser().getOrganization(), id, request);
    }

    @DeleteMapping("/api/lab/categories/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public void deactivateCategory(@PathVariable Long id) {
        catalogService.deactivateCategory(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/api/lab/tests")
    public List<LabTestDto> listTests(@RequestParam(value = "search", required = false) String search) {
        return catalogService.listTests(requireOrgUser().getOrganization(), search);
    }

    @PostMapping("/api/lab/tests")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabTestDto createTest(@Valid @RequestBody CreateLabTestRequest request) {
        return catalogService.createTest(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/api/lab/tests/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabTestDto updateTest(@PathVariable Long id, @Valid @RequestBody UpdateLabTestRequest request) {
        return catalogService.updateTest(requireOrgUser().getOrganization(), id, request);
    }

    @DeleteMapping("/api/lab/tests/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public void deactivateTest(@PathVariable Long id) {
        catalogService.deactivateTest(requireOrgUser().getOrganization(), id);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
