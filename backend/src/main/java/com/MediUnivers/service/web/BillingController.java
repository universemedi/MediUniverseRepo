package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.InvoiceStatus;
import com.MediUnivers.service.dto.ConfirmGatewayPaymentRequest;
import com.MediUnivers.service.dto.CreateGatewayOrderRequest;
import com.MediUnivers.service.dto.GatewayOrderDto;
import com.MediUnivers.service.dto.InvoiceDto;
import com.MediUnivers.service.dto.RecordPaymentRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/billing/invoices")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class BillingController {

    private final BillingService billingService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<InvoiceDto> list(@RequestParam(value = "status", required = false) String status) {
        InvoiceStatus parsed = status == null || status.isBlank() ? null : InvoiceStatus.valueOf(status.toUpperCase(Locale.ROOT));
        return billingService.list(requireOrgUser().getOrganization(), parsed);
    }

    @GetMapping("/patient/{patientId}")
    public List<InvoiceDto> listForPatient(@PathVariable Long patientId) {
        return billingService.listForPatient(requireOrgUser().getOrganization(), patientId);
    }

    @GetMapping("/{id}")
    public InvoiceDto get(@PathVariable Long id) {
        return billingService.get(requireOrgUser().getOrganization(), id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_RECEPTIONIST') or hasAuthority('ROLE_ACCOUNTANT') or hasAuthority('ROLE_PHARMACIST'))")
    public InvoiceDto recordPayment(@PathVariable Long id, @Valid @RequestBody RecordPaymentRequest request) {
        return billingService.toDto(billingService.recordPayment(requireOrgUser().getOrganization(), id, request));
    }

    /**
     * Step 1 of an online payment: ask the configured gateway (Razorpay today) to
     * open an order for this invoice's outstanding balance — GST is already baked
     * into that balance, since it was computed into the invoice at creation time,
     * long before any gateway is involved. The frontend uses the response to open
     * the gateway's checkout widget.
     */
    @PostMapping("/{id}/gateway/order")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_RECEPTIONIST') or hasAuthority('ROLE_ACCOUNTANT') or hasAuthority('ROLE_PHARMACIST'))")
    public GatewayOrderDto createGatewayOrder(@PathVariable Long id, @RequestBody(required = false) CreateGatewayOrderRequest request) {
        return billingService.createGatewayOrder(requireOrgUser().getOrganization(), id, request);
    }

    /** Step 2: verify what the gateway's checkout handed back, then record the payment for real. */
    @PostMapping("/{id}/gateway/confirm")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_RECEPTIONIST') or hasAuthority('ROLE_ACCOUNTANT') or hasAuthority('ROLE_PHARMACIST'))")
    public InvoiceDto confirmGatewayPayment(@PathVariable Long id, @Valid @RequestBody ConfirmGatewayPaymentRequest request) {
        return billingService.toDto(billingService.confirmGatewayPayment(requireOrgUser().getOrganization(), id, request));
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
