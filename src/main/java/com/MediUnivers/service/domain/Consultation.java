package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** The EMR foundation: one consultation per appointment, holding vitals, clinical notes and the prescription. */
@Entity
@Table(name = "consultations")
@Getter
@Setter
@NoArgsConstructor
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConsultationStatus status = ConsultationStatus.IN_PROGRESS;

    @Column(name = "chief_complaint", length = 500)
    private String chiefComplaint;

    @Column(name = "clinical_notes", length = 4000)
    private String clinicalNotes;

    @Column(length = 500)
    private String diagnosis;

    // --- Vitals ---
    @Column(name = "height_cm", precision = 6, scale = 2)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "temperature_f", precision = 5, scale = 2)
    private BigDecimal temperatureF;

    @Column(name = "blood_pressure", length = 20)
    private String bloodPressure;

    @Column(name = "pulse_bpm")
    private Integer pulseBpm;

    @Column(name = "spo2_percent")
    private Integer spo2Percent;

    // --- Prescription ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "prescription_items", joinColumns = @JoinColumn(name = "consultation_id"))
    private List<PrescriptionItem> prescriptionItems = new ArrayList<>();

    // --- Follow-up ---
    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "follow_up_notes", length = 500)
    private String followUpNotes;

    // --- Pharmacy handoff ---
    @Enumerated(EnumType.STRING)
    @Column(name = "pharmacy_status", nullable = false, length = 20)
    private PharmacyQueueStatus pharmacyStatus = PharmacyQueueStatus.NONE;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public BigDecimal bmi() {
        if (heightCm == null || weightKg == null || heightCm.signum() == 0) return null;
        BigDecimal heightM = heightCm.divide(BigDecimal.valueOf(100));
        return weightKg.divide(heightM.multiply(heightM), 1, java.math.RoundingMode.HALF_UP);
    }
}
