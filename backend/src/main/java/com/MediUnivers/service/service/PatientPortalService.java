package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.AppointmentRepository;
import com.MediUnivers.service.repository.DoctorAvailabilityRepository;
import com.MediUnivers.service.repository.DoctorRepository;
import com.MediUnivers.service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The logged-in patient's own view of their clinical and billing records. A
 * patient-portal account isn't linked to its clinical {@link Patient} record
 * by a foreign key (that account-linking flow doesn't exist yet) — it's
 * resolved by matching the login email against the org's patient roster,
 * same organization the account belongs to. If reception registered the
 * patient under a different email, the portal has nothing to show them yet.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientPortalService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorAvailabilityRepository availabilityRepository;
    private final ClinicAppointmentService appointmentService;
    private final ClinicConsultationService consultationService;
    private final LabOrderService labOrderService;
    private final BillingService billingService;
    private final AccessService accessService;

    public Patient requireCurrentPatient(AppUser user) {
        Organization organization = user.getOrganization();
        if (organization == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        accessService.requireModuleEnabled(organization, ModuleGroup.PATIENT);
        return patientRepository.findByOrganizationIdAndEmailIgnoreCase(organization.getId(), user.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "We couldn't find a patient record matching your account email — ask reception to update it on file."));
    }

    public List<AppointmentDto> listAppointments(AppUser user) {
        Patient patient = requireCurrentPatient(user);
        return appointmentService.listForPatient(user.getOrganization(), patient.getId());
    }

    public List<ConsultationDto> listPrescriptions(AppUser user) {
        Patient patient = requireCurrentPatient(user);
        return consultationService.historyForPatient(user.getOrganization(), patient.getId());
    }

    /** Only released (verified) reports — a patient shouldn't see raw, unverified lab results. */
    public List<LabOrderDto> listLabReports(AppUser user) {
        Patient patient = requireCurrentPatient(user);
        return labOrderService.listForPatient(user.getOrganization(), patient.getId()).stream()
                .filter(o -> o.status().equals(LabOrderStatus.VERIFIED.name()) || o.status().equals(LabOrderStatus.COMPLETED.name()))
                .toList();
    }

    public List<InvoiceDto> listInvoices(AppUser user) {
        Patient patient = requireCurrentPatient(user);
        return billingService.listForPatient(user.getOrganization(), patient.getId());
    }

    /** Weekly recurring availability for the chosen date, minus whatever's already booked that day. */
    public List<AvailableSlotDto> availableSlots(AppUser user, Long doctorId, LocalDate date) {
        Organization organization = user.getOrganization();
        Doctor doctor = doctorRepository.findById(doctorId)
                .filter(d -> d.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found."));

        List<DoctorAvailability> windows = availabilityRepository.findByDoctorId(doctorId).stream()
                .filter(a -> a.getDayOfWeek() == date.getDayOfWeek())
                .toList();

        Set<LocalTime> taken = appointmentRepository
                .findByOrganizationIdAndDoctorIdAndAppointmentDate(organization.getId(), doctorId, date).stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .map(a -> a.getScheduledAt() != null
                        ? a.getScheduledAt().atZone(ZoneId.systemDefault()).toLocalTime()
                        : null)
                .filter(t -> t != null)
                .collect(Collectors.toSet());

        List<AvailableSlotDto> slots = new ArrayList<>();
        for (DoctorAvailability window : windows) {
            LocalTime t = window.getStartTime();
            while (t.isBefore(window.getEndTime())) {
                slots.add(new AvailableSlotDto(t, !taken.contains(t)));
                t = t.plusMinutes(window.getSlotMinutes());
            }
        }
        return slots;
    }

    @Transactional
    public AppointmentDto book(AppUser user, BookPatientAppointmentRequest request) {
        Patient patient = requireCurrentPatient(user);
        Instant scheduledAt = request.time().atDate(request.appointmentDate())
                .atZone(ZoneId.systemDefault()).toInstant();
        CreateAppointmentRequest createRequest = new CreateAppointmentRequest(
                patient.getId(), request.doctorId(), request.appointmentDate(), scheduledAt, request.reason(), null);
        return appointmentService.book(user.getOrganization(), createRequest);
    }
}
