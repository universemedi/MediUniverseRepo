package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.EnterResultRequest;
import com.MediUnivers.service.dto.LabOrderDto;
import com.MediUnivers.service.dto.VerifyResultsRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.LabResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lab/orders/{orderId}/results")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER') or hasAuthority('ROLE_LAB_TECHNICIAN'))")
public class LabResultController {

    private final LabResultService resultService;
    private final CurrentUserService currentUserService;

    @PostMapping
    public LabOrderDto enterResult(@PathVariable Long orderId, @Valid @RequestBody EnterResultRequest request) {
        return resultService.enterResult(requireOrgUser().getOrganization(), orderId, request);
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabOrderDto verify(@PathVariable Long orderId, @Valid @RequestBody VerifyResultsRequest request) {
        return resultService.verifyResults(requireOrgUser().getOrganization(), orderId, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
