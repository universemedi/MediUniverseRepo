package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicPatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/clinic/patients")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class ClinicPatientController {

    private final ClinicPatientService patientService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<PatientDto> list(@RequestParam(value = "search", required = false) String search) {
        return patientService.list(requireOrgUser().getOrganization(), search);
    }

    @PostMapping
    public PatientDto create(@Valid @RequestBody CreatePatientRequest request) {
        return patientService.create(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/{id}")
    public PatientDto get(@PathVariable Long id) {
        return patientService.get(requireOrgUser().getOrganization(), id);
    }

    @PutMapping("/{id}")
    public PatientDto update(@PathVariable Long id, @Valid @RequestBody UpdatePatientRequest request) {
        return patientService.update(requireOrgUser().getOrganization(), id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_RECEPTIONIST'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        patientService.deactivate(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/{id}/family")
    public List<FamilyMemberDto> listFamily(@PathVariable Long id) {
        return patientService.listFamilyMembers(requireOrgUser().getOrganization(), id);
    }

    @PostMapping("/{id}/family")
    public FamilyMemberDto addFamily(@PathVariable Long id, @Valid @RequestBody CreateFamilyMemberRequest request) {
        return patientService.addFamilyMember(requireOrgUser().getOrganization(), id, request);
    }

    @PostMapping("/{id}/invite-portal")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_RECEPTIONIST'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void invitePortal(@PathVariable Long id) {
        patientService.invitePatientToPortal(requireOrgUser().getOrganization(), id);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
