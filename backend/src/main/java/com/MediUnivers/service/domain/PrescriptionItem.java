package com.MediUnivers.service.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A single prescribed medicine line. Free-text medicine name is always kept
 * (a doctor can prescribe something outside the pharmacy's own catalogue, or
 * a compounded/custom instruction), but when the doctor picks a real catalogue
 * entry, medicineId links it — that's what lets Pharmacy validate a dispense
 * against an actual prescription instead of a plain string match.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class PrescriptionItem {

    /** Set only when the doctor selected a real Pharmacy catalogue entry — null for free-text/custom items. */
    @Column(name = "medicine_id")
    private Long medicineId;

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
