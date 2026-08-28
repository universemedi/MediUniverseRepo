package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.PharmacyCatalogService;
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
public class PharmacyCatalogController {

    private final PharmacyCatalogService catalogService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/pharmacy/suppliers")
    public List<SupplierDto> listSuppliers() {
        return catalogService.listSuppliers(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/pharmacy/suppliers")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
    public SupplierDto createSupplier(@Valid @RequestBody CreateSupplierRequest request) {
        return catalogService.createSupplier(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/api/pharmacy/medicines")
    public List<MedicineDto> listMedicines(
            @RequestParam(value = "branchId", required = false) Long branchId,
            @RequestParam(value = "search", required = false) String search) {
        return catalogService.listMedicines(requireOrgUser().getOrganization(), branchId, search);
    }

    @PostMapping("/api/pharmacy/medicines")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
    public MedicineDto createMedicine(@Valid @RequestBody CreateMedicineRequest request) {
        return catalogService.createMedicine(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
