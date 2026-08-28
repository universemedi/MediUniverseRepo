package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Generic, atomic document-numbering engine shared by every module (patient
 * IDs, appointment numbers, tokens, invoices, prescriptions, ...) instead of
 * each module inventing its own counter. See Volume 3 Part 4 §19-23.
 */
@Entity
@Table(name = "number_series", uniqueConstraints = @UniqueConstraint(columnNames = {"organization_id", "code"}))
@Getter
@Setter
@NoArgsConstructor
public class NumberSeries {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 10)
    private String prefix;

    @Column(name = "current_number", nullable = false)
    private long currentNumber;

    @Column(nullable = false)
    private int padding = 6;

    @Enumerated(EnumType.STRING)
    @Column(name = "reset_policy", nullable = false, length = 20)
    private ResetPolicy resetPolicy = ResetPolicy.NEVER;

    @Column(name = "last_reset_on")
    private LocalDate lastResetOn;

    public String format() {
        return prefix + String.format("%0" + padding + "d", currentNumber);
    }
}
