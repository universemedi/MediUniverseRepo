package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicAppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/clinic/appointments")
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class ClinicAppointmentController {

    private final ClinicAppointmentService appointmentService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<AppointmentDto> listForDate(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return appointmentService.listForDate(requireOrgUser().getOrganization(), date != null ? date : LocalDate.now());
    }

    @PostMapping
    public AppointmentDto book(@Valid @RequestBody CreateAppointmentRequest request) {
        return appointmentService.book(requireOrgUser().getOrganization(), request);
    }

    @PostMapping("/walk-in")
    public AppointmentDto walkIn(@Valid @RequestBody WalkInRequest request) {
        return appointmentService.walkIn(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/{id}/status")
    public AppointmentDto updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateAppointmentStatusRequest request) {
        return appointmentService.updateStatus(requireOrgUser().getOrganization(), id, request);
    }

    @GetMapping("/patient/{patientId}")
    public List<AppointmentDto> listForPatient(@PathVariable Long patientId) {
        return appointmentService.listForPatient(requireOrgUser().getOrganization(), patientId);
    }

    @PutMapping("/{id}/reschedule")
    public AppointmentDto reschedule(@PathVariable Long id, @Valid @RequestBody RescheduleAppointmentRequest request) {
        return appointmentService.reschedule(requireOrgUser().getOrganization(), id, request);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
