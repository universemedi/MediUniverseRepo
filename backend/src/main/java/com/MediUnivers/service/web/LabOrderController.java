package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.LabOrderStatus;
import com.MediUnivers.service.dto.CancelLabOrderRequest;
import com.MediUnivers.service.dto.CollectSampleRequest;
import com.MediUnivers.service.dto.CreateLabOrderRequest;
import com.MediUnivers.service.dto.LabOrderDto;
import com.MediUnivers.service.dto.RejectSampleRequest;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.LabOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lab/orders")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class LabOrderController {

    private final LabOrderService orderService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<LabOrderDto> list(@RequestParam(value = "status", required = false) String status) {
        List<LabOrderStatus> statuses = status == null || status.isBlank() ? null
                : Arrays.stream(status.split(",")).map(s -> LabOrderStatus.valueOf(s.trim().toUpperCase(Locale.ROOT))).toList();
        return orderService.list(requireOrgUser().getOrganization(), statuses);
    }

    @GetMapping("/patient/{patientId}")
    public List<LabOrderDto> listForPatient(@PathVariable Long patientId) {
        return orderService.listForPatient(requireOrgUser().getOrganization(), patientId);
    }

    @PostMapping
    public LabOrderDto create(@Valid @RequestBody CreateLabOrderRequest request) {
        return orderService.createOrder(requireOrgUser().getOrganization(), request);
    }

    @PostMapping("/{id}/collect-sample")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER') or hasAuthority('ROLE_LAB_TECHNICIAN'))")
    public LabOrderDto collectSample(@PathVariable Long id, @Valid @RequestBody CollectSampleRequest request) {
        return orderService.collectSample(requireOrgUser().getOrganization(), id, request);
    }

    @PostMapping("/{id}/start-processing")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER') or hasAuthority('ROLE_LAB_TECHNICIAN'))")
    public LabOrderDto startProcessing(@PathVariable Long id) {
        return orderService.markProcessing(requireOrgUser().getOrganization(), id);
    }

    @PostMapping("/{id}/reject-sample")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER') or hasAuthority('ROLE_LAB_TECHNICIAN'))")
    public LabOrderDto rejectSample(@PathVariable Long id, @Valid @RequestBody RejectSampleRequest request) {
        return orderService.rejectSample(requireOrgUser().getOrganization(), id, request);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_LAB_MANAGER'))")
    public LabOrderDto cancel(@PathVariable Long id, @RequestBody(required = false) CancelLabOrderRequest request) {
        return orderService.cancelOrder(requireOrgUser().getOrganization(), id, request != null ? request : new CancelLabOrderRequest(null));
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
