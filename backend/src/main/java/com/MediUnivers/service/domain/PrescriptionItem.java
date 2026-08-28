package com.MediUnivers.service.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A single prescribed medicine line. Free-text medicine name for now (the
 * Pharmacy module's medicine catalogue isn't built yet) — once it exists this
 * can carry a medicineId reference instead without changing the API shape
 * the frontend already renders.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class PrescriptionItem {

    @Column(name = "medicine_name", nullable = false, length = 160)
    private String medicineName;

    @Column(length = 60)
    private String dosage;

    @Column(length = 60)
    private String frequency;

    @Column(length = 60)
    private String duration;

    @Column(length = 300)
    private String instructions;
}
