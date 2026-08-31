package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.ClinicDoctorService;
import com.MediUnivers.service.service.PatientPortalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** The logged-in patient's own appointments, prescriptions, lab reports and invoices — real data, scoped to them. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/patient")
@PreAuthorize("hasAuthority('PORTAL_PATIENT')")
public class PatientPortalController {

    private final PatientPortalService portalService;
    private final ClinicDoctorService doctorService;
    private final CurrentUserService currentUserService;

    @GetMapping("/appointments")
    public List<AppointmentDto> appointments() {
        return portalService.listAppointments(currentUserService.require());
    }

    @GetMapping("/prescriptions")
    public List<ConsultationDto> prescriptions() {
        return portalService.listPrescriptions(currentUserService.require());
    }

    @GetMapping("/reports")
    public List<LabOrderDto> reports() {
        return portalService.listLabReports(currentUserService.require());
    }

    @GetMapping("/invoices")
    public List<InvoiceDto> invoices() {
        return portalService.listInvoices(currentUserService.require());
    }

    @GetMapping("/doctors")
    public List<DoctorDto> doctors() {
        return doctorService.list(currentUserService.require().getOrganization());
    }

    @GetMapping("/doctors/{doctorId}/slots")
    public List<AvailableSlotDto> slots(@PathVariable Long doctorId,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return portalService.availableSlots(currentUserService.require(), doctorId, date);
    }

    @PostMapping("/appointments")
    public AppointmentDto book(@Valid @RequestBody BookPatientAppointmentRequest request) {
        return portalService.book(currentUserService.require(), request);
    }
}
