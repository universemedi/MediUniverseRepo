package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Every test can have several ranges — different genders and age bands read differently. */
@Entity
@Table(name = "lab_reference_ranges")
@Getter
@Setter
@NoArgsConstructor
public class LabReferenceRange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_id")
    private LabTest test;

    /** null = applies regardless of gender */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "age_min")
    private Integer ageMin;

    @Column(name = "age_max")
    private Integer ageMax;

    @Column(name = "min_value", precision = 10, scale = 3)
    private BigDecimal minValue;

    @Column(name = "max_value", precision = 10, scale = 3)
    private BigDecimal maxValue;

    @Column(name = "critical_low", precision = 10, scale = 3)
    private BigDecimal criticalLow;

    @Column(name = "critical_high", precision = 10, scale = 3)
    private BigDecimal criticalHigh;

    @Column(length = 20)
    private String unit;

    public boolean matches(Gender patientGender, Integer patientAge) {
        boolean genderOk = this.gender == null || this.gender == patientGender;
        boolean ageOk = (ageMin == null || patientAge == null || patientAge >= ageMin)
                && (ageMax == null || patientAge == null || patientAge <= ageMax);
        return genderOk && ageOk;
    }
}
