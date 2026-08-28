package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.CreateReturnRequest;
import com.MediUnivers.service.dto.PharmacyReturnDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.PharmacyReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pharmacy/returns")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_PHARMACIST'))")
public class PharmacyReturnController {

    private final PharmacyReturnService returnService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<PharmacyReturnDto> list() {
        return returnService.list(requireOrgUser().getOrganization());
    }

    @PostMapping
    public PharmacyReturnDto create(@Valid @RequestBody CreateReturnRequest request) {
        return returnService.createReturn(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
