package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.AddLeadNoteRequest;
import com.MediUnivers.service.dto.AssignLeadRequest;
import com.MediUnivers.service.dto.LeadDto;
import com.MediUnivers.service.dto.UpdateLeadStatusRequest;
import com.MediUnivers.service.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Platform sales' working view of every lead captured by the public site
 * (Contact, Request Demo, Free Trial, Pricing) — the "standard CRM process"
 * (req #2). Gated to the same roles DataSeeder already seeds with
 * platform/leads and platform/demo-requests page access.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/leads")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_SALES_LEAD') or hasAuthority('ROLE_PLATFORM_SALES_AGENT'))")
public class LeadController {

    private final LeadService leadService;

    @GetMapping
    public List<LeadDto> list() {
        return leadService.listAll();
    }

    @PatchMapping("/{id}/status")
    public LeadDto updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateLeadStatusRequest request) {
        return leadService.updateStatus(id, request.status());
    }

    @PatchMapping("/{id}/assign")
    public LeadDto assign(@PathVariable Long id, @RequestBody AssignLeadRequest request) {
        return leadService.assign(id, request.userId());
    }

    @PostMapping("/{id}/notes")
    public LeadDto addNote(@PathVariable Long id, @Valid @RequestBody AddLeadNoteRequest request) {
        return leadService.addNote(id, request.note());
    }
}
