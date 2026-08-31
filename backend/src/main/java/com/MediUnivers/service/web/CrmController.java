package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.CrmActivityService;
import com.MediUnivers.service.service.CrmFollowUpService;
import com.MediUnivers.service.service.CrmLeadService;
import com.MediUnivers.service.service.CrmLeadSourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** The organization's own patient/customer CRM — sources, leads, follow-ups and the activity timeline. */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class CrmController {

    private final CrmLeadSourceService sourceService;
    private final CrmLeadService leadService;
    private final CrmFollowUpService followUpService;
    private final CrmActivityService activityService;
    private final CurrentUserService currentUserService;

    // ---- Sources ----

    @GetMapping("/api/crm/sources")
    public List<CrmLeadSourceDto> listSources() {
        return sourceService.list(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/crm/sources")
    public CrmLeadSourceDto createSource(@Valid @RequestBody CreateCrmLeadSourceRequest request) {
        return sourceService.create(requireOrgUser().getOrganization(), request);
    }

    // ---- Leads ----

    @GetMapping("/api/crm/leads")
    public List<CrmLeadDto> listLeads() {
        return leadService.list(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/crm/leads")
    public CrmLeadDto createLead(@Valid @RequestBody CreateCrmLeadRequest request) {
        return leadService.create(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/api/crm/leads/{id}")
    public CrmLeadDto updateLead(@PathVariable Long id, @Valid @RequestBody UpdateCrmLeadRequest request) {
        return leadService.update(requireOrgUser().getOrganization(), id, request);
    }

    // ---- Follow-ups ----

    @GetMapping("/api/crm/follow-ups")
    public List<CrmFollowUpDto> listFollowUps() {
        return followUpService.list(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/crm/follow-ups")
    public CrmFollowUpDto createFollowUp(@Valid @RequestBody CreateCrmFollowUpRequest request) {
        return followUpService.create(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/api/crm/follow-ups/{id}")
    public CrmFollowUpDto updateFollowUp(@PathVariable Long id, @Valid @RequestBody UpdateCrmFollowUpRequest request) {
        return followUpService.updateStatus(requireOrgUser().getOrganization(), id, request);
    }

    // ---- Activities ----

    @GetMapping("/api/crm/activities")
    public List<CrmActivityDto> listActivities() {
        return activityService.list(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/crm/activities")
    public CrmActivityDto createActivity(@Valid @RequestBody CreateCrmActivityRequest request) {
        return activityService.create(requireOrgUser().getOrganization(), request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
