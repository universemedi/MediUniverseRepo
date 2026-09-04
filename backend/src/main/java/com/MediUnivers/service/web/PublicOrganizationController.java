package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.ConfirmGatewayPaymentRequest;
import com.MediUnivers.service.dto.GatewayOrderDto;
import com.MediUnivers.service.dto.OrganizationDto;
import com.MediUnivers.service.dto.PublicOrganizationSignupRequest;
import com.MediUnivers.service.dto.PublicSignupResultDto;
import com.MediUnivers.service.dto.SelectCustomPlanRequest;
import com.MediUnivers.service.dto.SelectPlanRequest;
import com.MediUnivers.service.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Self-serve organization signup, no login required (req #3, #5, #6):
 * /free-trial captures org + owner and activates a trial in one step (no
 * payment step exists for it). /create-account is step 1 of the paid path —
 * org + owner only, no plan yet, org stays DRAFT — and /{id}/select-plan +
 * /{id}/subscribe/confirm are step 2: pick a real plan and pay, both keyed
 * by the signup token /create-account returns instead of a session.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/organizations")
public class PublicOrganizationController {

    private final OrganizationService organizationService;

    @PostMapping("/free-trial")
    public OrganizationDto freeTrial(@Valid @RequestBody PublicOrganizationSignupRequest request) {
        return organizationService.createFreeTrial(request);
    }

    @PostMapping("/create-account")
    public PublicSignupResultDto createAccount(@Valid @RequestBody PublicOrganizationSignupRequest request) {
        return organizationService.createAccount(request);
    }

    @PostMapping("/{id}/select-plan")
    public GatewayOrderDto selectPlan(@PathVariable Long id, @RequestHeader("X-Signup-Token") String signupToken,
                                       @Valid @RequestBody SelectPlanRequest request) {
        return organizationService.selectPlanAndCreateGatewayOrder(id, signupToken, request);
    }

    @PostMapping("/{id}/select-custom-plan")
    public GatewayOrderDto selectCustomPlan(@PathVariable Long id, @RequestHeader("X-Signup-Token") String signupToken,
                                             @Valid @RequestBody SelectCustomPlanRequest request) {
        return organizationService.selectCustomPlanAndCreateGatewayOrder(id, signupToken, request);
    }

    @PostMapping("/{id}/subscribe/confirm")
    public OrganizationDto confirm(@PathVariable Long id, @RequestHeader("X-Signup-Token") String signupToken,
                                    @Valid @RequestBody ConfirmGatewayPaymentRequest request) {
        return organizationService.confirmSubscriptionPayment(id, signupToken, request);
    }
}
