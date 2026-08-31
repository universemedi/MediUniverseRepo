package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.dto.CreateSavedReportRequest;
import com.MediUnivers.service.dto.SavedReportDto;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.SavedReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/** Shared by every module's "Reports" page (clinic/reports, pharmacy/reports, crm/reports, ...) — discriminated by ?group=. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/org/reports")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class SavedReportController {

    private final SavedReportService service;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<SavedReportDto> list(@RequestParam("group") String group) {
        return service.list(requireOrgUser().getOrganization(), parseGroup(group));
    }

    @PostMapping
    public SavedReportDto create(@RequestParam("group") String group, @Valid @RequestBody CreateSavedReportRequest request) {
        return service.create(requireOrgUser().getOrganization(), parseGroup(group), request);
    }

    private ModuleGroup parseGroup(String group) {
        try {
            return ModuleGroup.valueOf(group.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown module group: " + group);
        }
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
