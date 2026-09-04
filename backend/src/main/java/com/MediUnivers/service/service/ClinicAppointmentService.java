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
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
    private final NotificationService notificationService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a").withLocale(Locale.ENGLISH);

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
        notifyBooked(organization, a);
        scheduleReminders(organization, a);
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
        if (target == AppointmentStatus.CANCELLED) {
            notifyCancelled(organization, a);
        }
        return toDto(a);
    }

    /** Moves a still-pending appointment to a new date/time, optionally a different doctor — a booked slot that hasn't
     * been acted on yet is free to move; one already checked in, in consultation, completed or cancelled is not. */
    public AppointmentDto reschedule(Organization organization, Long appointmentId, RescheduleAppointmentRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        Appointment a = requireOwned(organization, appointmentId);
        if (a.getStatus() != AppointmentStatus.BOOKED && a.getStatus() != AppointmentStatus.NO_SHOW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Can't reschedule an appointment that's already " + a.getStatus().name().toLowerCase(Locale.ROOT) + ".");
        }
        if (request.doctorId() != null && !request.doctorId().equals(a.getDoctor().getId())) {
            a.setDoctor(doctorService.requireOwned(organization, request.doctorId()));
        }
        a.setAppointmentDate(request.appointmentDate());
        a.setScheduledAt(request.scheduledAt());
        a.setStatus(AppointmentStatus.BOOKED);
        a = appointmentRepository.save(a);
        notifyBooked(organization, a);
        scheduleReminders(organization, a);
        return toDto(a);
    }

    // ---------------- Communication Engine hooks ----------------

    private void notifyBooked(Organization organization, Appointment a) {
        notificationService.notify(organization, NotificationEventType.APPOINTMENT_BOOKED,
                recipientFor(a), appointmentVariables(organization, a), NotificationPriority.NORMAL,
                "APPOINTMENT", a.getId(), null);
    }

    private void notifyCancelled(Organization organization, Appointment a) {
        notificationService.notify(organization, NotificationEventType.APPOINTMENT_CANCELLED,
                recipientFor(a), appointmentVariables(organization, a), NotificationPriority.HIGH,
                "APPOINTMENT", a.getId(), null);
    }

    /** Appointment Reminder (spec §17): 24 hours before, then 2 hours before — only if there's still time to send them. */
    private void scheduleReminders(Organization organization, Appointment a) {
        if (a.getScheduledAt() == null) return;
        Instant now = Instant.now();
        Instant reminder24h = a.getScheduledAt().minus(24, ChronoUnit.HOURS);
        Instant reminder2h = a.getScheduledAt().minus(2, ChronoUnit.HOURS);
        Map<String, String> variables = appointmentVariables(organization, a);
        if (reminder24h.isAfter(now)) {
            notificationService.notify(organization, NotificationEventType.APPOINTMENT_REMINDER, recipientFor(a),
                    variables, NotificationPriority.NORMAL, "APPOINTMENT", a.getId(), reminder24h);
        }
        if (reminder2h.isAfter(now)) {
            notificationService.notify(organization, NotificationEventType.APPOINTMENT_REMINDER, recipientFor(a),
                    variables, NotificationPriority.HIGH, "APPOINTMENT", a.getId(), reminder2h);
        }
    }

    private NotificationRecipient recipientFor(Appointment a) {
        Patient p = a.getPatient();
        return NotificationRecipient.of(p.fullName(), p.getEmail(), p.getPhone());
    }

    private Map<String, String> appointmentVariables(Organization organization, Appointment a) {
        Map<String, String> vars = new HashMap<>();
        vars.put("patientName", a.getPatient().fullName());
        vars.put("doctorName", a.getDoctor().getFullName());
        vars.put("organizationName", organization.getName());
        vars.put("appointmentDate", a.getAppointmentDate() != null ? a.getAppointmentDate().toString() : "");
        vars.put("appointmentTime", a.getScheduledAt() != null
                ? TIME_FMT.format(a.getScheduledAt().atZone(java.time.ZoneId.systemDefault())) : "");
        return vars;
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
                new DoctorSummaryDto(d.getId(), d.getFullName()),
                a.getBranch() != null ? a.getBranch().getName() : null);
    }
}
