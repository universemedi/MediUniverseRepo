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

    @GetMapping("/api/lab/tests")
    public List<LabTestDto> listTests(@RequestParam(value = "search", required = false) String search) {
        return catalogService.listTests(requireOrgUser().getOrganization(), search);
    }

    @PostMapping("/api/lab/tests")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabTestDto createTest(@Valid @RequestBody CreateLabTestRequest request) {
        return catalogService.createTest(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
