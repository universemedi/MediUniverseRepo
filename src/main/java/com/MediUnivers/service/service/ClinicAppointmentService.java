package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.AppointmentRepository;
import com.MediUnivers.service.repository.BranchRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class ClinicAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final BranchRepository branchRepository;
    private final ClinicPatientService patientService;
    private final ClinicDoctorService doctorService;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public List<AppointmentDto> listForDate(Organization organization, LocalDate date) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        return appointmentRepository
                .findByOrganizationIdAndAppointmentDateOrderByScheduledAtAsc(organization.getId(), date)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> listForPatient(Organization organization, Long patientId) {
        patientService.requireOwned(organization, patientId);
        return appointmentRepository.findByPatientIdOrderByAppointmentDateDesc(patientId)
                .stream().map(this::toDto).toList();
    }

    public AppointmentDto book(Organization organization, CreateAppointmentRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        Patient patient = patientService.requireOwned(organization, request.patientId());
        Doctor doctor = doctorService.requireOwned(organization, request.doctorId());
        Branch branch = resolveBranch(organization, request.branchId());

        Appointment a = new Appointment();
        a.setOrganization(organization);
        a.setBranch(branch);
        a.setPatient(patient);
        a.setDoctor(doctor);
        a.setType(AppointmentType.SCHEDULED);
        a.setStatus(AppointmentStatus.BOOKED);
        a.setAppointmentDate(request.appointmentDate());
        a.setScheduledAt(request.scheduledAt());
        a.setReason(request.reason());
        a.setAppointmentNumber(numberSeriesService.next(organization, "APPOINTMENT", "APT", ResetPolicy.YEARLY, 6));
        a = appointmentRepository.save(a);
        return toDto(a);
    }

    /** Walk-in patients skip the booking step and go straight into today's token queue. */
    public AppointmentDto walkIn(Organization organization, WalkInRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        Patient patient = patientService.requireOwned(organization, request.patientId());
        Doctor doctor = doctorService.requireOwned(organization, request.doctorId());
        Branch branch = resolveBranch(organization, request.branchId());

        Appointment a = new Appointment();
        a.setOrganization(organization);
        a.setBranch(branch);
        a.setPatient(patient);
        a.setDoctor(doctor);
        a.setType(AppointmentType.WALK_IN);
        a.setStatus(AppointmentStatus.CHECKED_IN);
        a.setAppointmentDate(LocalDate.now());
        a.setScheduledAt(Instant.now());
        a.setReason(request.reason());
        a.setCheckedInAt(Instant.now());
        a.setAppointmentNumber(numberSeriesService.next(organization, "APPOINTMENT", "APT", ResetPolicy.YEARLY, 6));
        a.setTokenNumber(numberSeriesService.next(organization, "TOKEN", "A", ResetPolicy.DAILY, 3));
        a = appointmentRepository.save(a);
        return toDto(a);
    }

    public AppointmentDto updateStatus(Organization organization, Long appointmentId, UpdateAppointmentStatusRequest request) {
        Appointment a = requireOwned(organization, appointmentId);
        AppointmentStatus target;
        try {
            target = AppointmentStatus.valueOf(request.status().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown appointment status: " + request.status());
        }

        // Walk-ins are created already CHECKED_IN with a token; scheduled visits check in here,
        // which is also where a token gets assigned for the reception/doctor queue board.
        if (target == AppointmentStatus.CHECKED_IN) {
            a.setCheckedInAt(Instant.now());
            if (a.getTokenNumber() == null) {
                a.setTokenNumber(numberSeriesService.next(organization, "TOKEN", "A", ResetPolicy.DAILY, 3));
            }
        }
        if (target == AppointmentStatus.COMPLETED) {
            a.setCompletedAt(Instant.now());
        }
        a.setStatus(target);
        a = appointmentRepository.save(a);
        return toDto(a);
    }

    Appointment requireOwned(Organization organization, Long appointmentId) {
        Appointment a = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + appointmentId));
        if (!a.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This appointment does not belong to your organization.");
        }
        return a;
    }

    private Branch resolveBranch(Organization organization, Long branchId) {
        if (branchId == null) return null;
        return branchRepository.findById(branchId)
                .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization."));
    }

    private AppointmentDto toDto(Appointment a) {
        Patient p = a.getPatient();
        Doctor d = a.getDoctor();
        return new AppointmentDto(a.getId(), a.getAppointmentNumber(), a.getTokenNumber(),
                a.getType().name(), a.getStatus().name(), a.getAppointmentDate(), a.getScheduledAt(), a.getReason(),
                new PatientSummaryDto(p.getId(), p.getPatientNumber(), p.fullName(), p.getPhone()),
                new DoctorSummaryDto(d.getId(), d.getFullName()));
    }
}
