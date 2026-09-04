package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.ChangePlanRequest;
import com.MediUnivers.service.dto.ConfirmGatewayPaymentRequest;
import com.MediUnivers.service.dto.GatewayOrderDto;
import com.MediUnivers.service.dto.OrganizationDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * The re-subscribe flow for an existing organization's own Owner — used when
 * the org has lapsed (SUSPENDED/CANCELLED, the only status besides
 * TRIAL/ACTIVE/GRACE_PERIOD where AppUserPrincipal.isEnabled() still lets the
 * Owner log in) and needs to pick a plan and pay to reactivate (req #4).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/subscription")
@PreAuthorize("hasAuthority('PORTAL_TENANT') and hasAuthority('ROLE_ORG_OWNER')")
public class OrgSubscriptionController {

    private final OrganizationService organizationService;
    private final CurrentUserService currentUserService;
    private final com.MediUnivers.service.service.AddonAccessService addonAccessService;

    @PostMapping("/change-plan/gateway-order")
    public GatewayOrderDto gatewayOrder(@Valid @RequestBody ChangePlanRequest request) {
        return organizationService.createPlanChangeGatewayOrder(requireOrgUser().getOrganization(), request);
    }

    @PostMapping("/change-plan/confirm")
    public OrganizationDto confirm(@Valid @RequestBody ConfirmGatewayPaymentRequest request) {
        return organizationService.confirmPlanChangePayment(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/addons")
    public java.util.List<com.MediUnivers.service.dto.SubscriptionAddonDto> currentAddons() {
        return addonAccessService.currentAddonDtos(requireOrgUser().getOrganization());
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
