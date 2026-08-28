package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.SaleType;
import com.MediUnivers.service.dto.CreateSaleRequest;
import com.MediUnivers.service.dto.PharmacySaleDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.PharmacySaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pharmacy/sales")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
public class PharmacySaleController {

    private final PharmacySaleService saleService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<PharmacySaleDto> list(@RequestParam(value = "today", defaultValue = "false") boolean today) {
        return saleService.list(requireOrgUser().getOrganization(), today);
    }

    /** A walk-in customer at the counter — no patient record required. */
    @PostMapping("/walk-in")
    public PharmacySaleDto walkInSale(@Valid @RequestBody CreateSaleRequest request) {
        return saleService.createSale(requireOrgUser().getOrganization(), SaleType.WALK_IN, request);
    }

    /** Dispensing against a doctor's prescription (pass consultationId in the request body). */
    @PostMapping("/dispense")
    public PharmacySaleDto dispense(@Valid @RequestBody CreateSaleRequest request) {
        return saleService.createSale(requireOrgUser().getOrganization(), SaleType.PRESCRIPTION, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
