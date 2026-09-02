package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.MasterDataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** The shared Master Data Engine — departments, specializations, medicine categories/units/manufacturers. */
@RestController
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataService masterDataService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/org/departments")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<DepartmentDto> listDepartments() {
        AppUser me = requireOrgUser();
        return masterDataService.listDepartments(me.getOrganization().getId());
    }

    @PostMapping("/api/org/departments")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    public DepartmentDto createDepartment(@Valid @RequestBody CreateDepartmentRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createDepartment(me.getOrganization(), request);
    }

    @PutMapping("/api/org/departments/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    public DepartmentDto updateDepartment(@PathVariable Long id, @Valid @RequestBody UpdateDepartmentRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.updateDepartment(me.getOrganization(), id, request);
    }

    @DeleteMapping("/api/org/departments/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateDepartment(@PathVariable Long id) {
        AppUser me = requireOrgUser();
        masterDataService.deactivateDepartment(me.getOrganization(), id);
    }

    /** Platform default specializations + this org's own — no auth required so the public site / login can show them too. */
    @GetMapping("/api/public/specializations")
    public List<SpecializationDto> listPlatformSpecializations() {
        return masterDataService.listSpecializations(null);
    }

    @GetMapping("/api/org/specializations")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<SpecializationDto> listOrgSpecializations() {
        AppUser me = requireOrgUser();
        return masterDataService.listSpecializations(me.getOrganization().getId());
    }

    @PostMapping("/api/org/specializations")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    public SpecializationDto createSpecialization(@Valid @RequestBody CreateSpecializationRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createSpecialization(me.getOrganization(), request);
    }

    // --- Pharmacy master data ---

    @GetMapping("/api/org/medicine-categories")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<MasterItemDto> listMedicineCategories() {
        AppUser me = requireOrgUser();
        return masterDataService.listMedicineCategories(me.getOrganization().getId());
    }

    @PostMapping("/api/org/medicine-categories")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
    public MasterItemDto createMedicineCategory(@Valid @RequestBody CreateMasterItemRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createMedicineCategory(me.getOrganization(), request);
    }

    @GetMapping("/api/org/medicine-units")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<MasterItemDto> listMedicineUnits() {
        AppUser me = requireOrgUser();
        return masterDataService.listMedicineUnits(me.getOrganization().getId());
    }

    @PostMapping("/api/org/medicine-units")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
    public MasterItemDto createMedicineUnit(@Valid @RequestBody CreateMasterItemRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createMedicineUnit(me.getOrganization(), request);
    }

    @GetMapping("/api/org/manufacturers")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<MasterItemDto> listManufacturers() {
        AppUser me = requireOrgUser();
        return masterDataService.listManufacturers(me.getOrganization().getId());
    }

    @PostMapping("/api/org/manufacturers")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
    public MasterItemDto createManufacturer(@Valid @RequestBody CreateMasterItemRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createManufacturer(me.getOrganization(), request);
    }

    // --- GST / Tax rules ---

    /** Platform's standard GST slabs — public so the pricing page and signup flow can show them too. */
    @GetMapping("/api/public/tax-rules")
    public List<TaxRuleDto> listPlatformTaxRules() {
        return masterDataService.listTaxRules(null);
    }

    @GetMapping("/api/org/tax-rules")
    @PreAuthorize("hasAuthority('PORTAL_TENANT')")
    public List<TaxRuleDto> listOrgTaxRules() {
        AppUser me = requireOrgUser();
        return masterDataService.listTaxRules(me.getOrganization().getId());
    }

    @PostMapping("/api/org/tax-rules")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_ACCOUNTANT'))")
    public TaxRuleDto createTaxRule(@Valid @RequestBody CreateTaxRuleRequest request) {
        AppUser me = requireOrgUser();
        return masterDataService.createTaxRule(me.getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
