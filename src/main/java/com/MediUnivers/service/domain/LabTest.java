package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "lab_tests")
@Getter
@Setter
@NoArgsConstructor
public class LabTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 30)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private LabTestCategory category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "sample_type", nullable = false, length = 40)
    private String sampleType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** GST/tax rate applied when this test is billed — configurable per test, same as Pharmacy. */
    @Column(name = "tax_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercent = BigDecimal.ZERO;

    @Column(name = "tat_hours", nullable = false)
    private int tatHours = 24;

    @OneToMany(mappedBy = "test", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<LabReferenceRange> referenceRanges = new ArrayList<>();

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    public void addReferenceRange(LabReferenceRange range) {
        range.setTest(this);
        this.referenceRanges.add(range);
    }
}
