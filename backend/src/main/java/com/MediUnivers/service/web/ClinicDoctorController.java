package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicDoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/clinic/doctors")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class ClinicDoctorController {

    private final ClinicDoctorService doctorService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<DoctorDto> list() {
        return doctorService.list(requireOrgUser().getOrganization());
    }

    @GetMapping("/me")
    public DoctorDto myProfile() {
        AppUser me = requireOrgUser();
        return doctorService.myProfile(me.getOrganization(), me.getId());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    public DoctorDto create(@Valid @RequestBody CreateDoctorRequest request) {
        return doctorService.create(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    public DoctorDto update(@PathVariable Long id, @Valid @RequestBody UpdateDoctorRequest request) {
        return doctorService.update(requireOrgUser().getOrganization(), id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN'))")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        doctorService.deactivate(requireOrgUser().getOrganization(), id);
    }

    @PutMapping("/{id}/photo")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_DOCTOR'))")
    public DoctorDto updatePhoto(@PathVariable Long id, @Valid @RequestBody UpdateDoctorPhotoRequest request) {
        return doctorService.updatePhoto(requireOrgUser().getOrganization(), id, request);
    }

    @GetMapping("/{id}/availability")
    public List<AvailabilitySlotDto> listAvailability(@PathVariable Long id) {
        return doctorService.listAvailability(requireOrgUser().getOrganization(), id);
    }

    @PutMapping("/{id}/availability")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLINIC_ADMIN') or hasAuthority('ROLE_DOCTOR'))")
    public List<AvailabilitySlotDto> setAvailability(@PathVariable Long id, @Valid @RequestBody SetAvailabilityRequest request) {
        return doctorService.setAvailability(requireOrgUser().getOrganization(), id, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
