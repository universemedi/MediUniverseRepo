package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.ConsultationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** The EMR foundation: one consultation per appointment — vitals, clinical notes, diagnosis and prescription. */
@Service
@RequiredArgsConstructor
@Transactional
public class ClinicConsultationService {

    private final ConsultationRepository consultationRepository;
    private final ClinicAppointmentService appointmentService;
    private final AccessService accessService;
    private final BillingService billingService;

    /** Doctor opens the appointment from the queue — this is what moves it into "In Consultation". */
    public ConsultationDto start(Organization organization, Long appointmentId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        Appointment appointment = appointmentService.requireOwned(organization, appointmentId);

        return consultationRepository.findByAppointmentId(appointmentId)
                .map(this::toDto)
                .orElseGet(() -> {
                    Consultation c = new Consultation();
                    c.setOrganization(organization);
                    c.setAppointment(appointment);
                    c.setPatient(appointment.getPatient());
                    c.setDoctor(appointment.getDoctor());
                    c.setStatus(ConsultationStatus.IN_PROGRESS);
                    c = consultationRepository.save(c);

                    // appointment is a managed entity in this same transaction — Hibernate
                    // flushes this status change on commit without needing an explicit save.
                    appointment.setStatus(AppointmentStatus.IN_CONSULTATION);
                    return toDto(c);
                });
    }

    public ConsultationDto complete(Organization organization, Long consultationId, CompleteConsultationRequest request) {
        Consultation c = requireOwned(organization, consultationId);

        c.setChiefComplaint(request.chiefComplaint());
        c.setClinicalNotes(request.clinicalNotes());
        c.setDiagnosis(request.diagnosis());
        c.setHeightCm(request.heightCm());
        c.setWeightKg(request.weightKg());
        c.setTemperatureF(request.temperatureF());
        c.setBloodPressure(request.bloodPressure());
        c.setPulseBpm(request.pulseBpm());
        c.setSpo2Percent(request.spo2Percent());
        c.setFollowUpDate(request.followUpDate());
        c.setFollowUpNotes(request.followUpNotes());

        List<PrescriptionItem> items = new ArrayList<>();
        if (request.prescriptionItems() != null) {
            for (PrescriptionItemInput in : request.prescriptionItems()) {
                PrescriptionItem item = new PrescriptionItem();
                item.setMedicineName(in.medicineName());
                item.setDosage(in.dosage());
                item.setFrequency(in.frequency());
                item.setDuration(in.duration());
                item.setInstructions(in.instructions());
                items.add(item);
            }
        }
        c.setPrescriptionItems(items);
        c.setStatus(ConsultationStatus.COMPLETED);
        c.setCompletedAt(Instant.now());
        c.setPharmacyStatus(items.isEmpty() ? PharmacyQueueStatus.NONE : PharmacyQueueStatus.PENDING);

        Appointment appointment = c.getAppointment();
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setCompletedAt(Instant.now());

        c = consultationRepository.save(c);

        // The Billing Engine, not this service, owns invoicing — Clinic just describes
        // what happened and hands it over. A doctor with no consultation fee set simply
        // doesn't generate a bill.
        Doctor doctor = c.getDoctor();
        if (doctor.getConsultationFee() != null && doctor.getConsultationFee().signum() > 0) {
            billingService.createInvoice(organization, appointment.getBranch(), c.getPatient(), SourceModule.CLINIC,
                    List.of(new InvoiceLineItemInput("Consultation — Dr. " + doctor.getFullName(),
                            "CONSULTATION", c.getId(), 1, doctor.getConsultationFee(),
                            java.math.BigDecimal.ZERO, doctor.getTaxPercent())));
        }

        return toDto(c);
    }

    @Transactional(readOnly = true)
    public ConsultationDto get(Organization organization, Long consultationId) {
        return toDto(requireOwned(organization, consultationId));
    }

    @Transactional(readOnly = true)
    public List<ConsultationDto> historyForPatient(Organization organization, Long patientId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        return consultationRepository.findByPatientIdOrderByStartedAtDesc(patientId).stream()
                .filter(c -> c.getOrganization().getId().equals(organization.getId()))
                .map(this::toDto)
                .toList();
    }

    /** Every consultation that actually issued a prescription — the clinic side's read-only view; dispensing itself happens in Pharmacy. */
    @Transactional(readOnly = true)
    public List<ConsultationDto> listPrescriptions(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CLINIC);
        return consultationRepository.findByOrganizationIdAndPharmacyStatusIn(organization.getId(),
                        List.of(PharmacyQueueStatus.PENDING, PharmacyQueueStatus.PARTIALLY_DISPENSED, PharmacyQueueStatus.DISPENSED))
                .stream().map(this::toDto).toList();
    }

    Consultation requireOwned(Organization organization, Long consultationId) {
        Consultation c = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new EntityNotFoundException("Consultation not found: " + consultationId));
        if (!c.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This consultation does not belong to your organization.");
        }
        return c;
    }

    private ConsultationDto toDto(Consultation c) {
        List<PrescriptionItemInput> items = c.getPrescriptionItems().stream()
                .map(i -> new PrescriptionItemInput(i.getMedicineName(), i.getDosage(), i.getFrequency(), i.getDuration(), i.getInstructions()))
                .toList();
        Patient p = c.getPatient();
        Doctor d = c.getDoctor();
        return new ConsultationDto(c.getId(), c.getAppointment().getId(), c.getStatus().name(),
                c.getChiefComplaint(), c.getClinicalNotes(), c.getDiagnosis(),
                c.getHeightCm(), c.getWeightKg(), c.bmi(), c.getTemperatureF(), c.getBloodPressure(),
                c.getPulseBpm(), c.getSpo2Percent(), items, c.getPharmacyStatus().name(),
                c.getFollowUpDate(), c.getFollowUpNotes(),
                new PatientSummaryDto(p.getId(), p.getPatientNumber(), p.fullName(), p.getPhone()),
                new DoctorSummaryDto(d.getId(), d.getFullName()),
                c.getStartedAt(), c.getCompletedAt());
    }
}
