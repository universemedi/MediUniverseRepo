package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

/** A bundled health-checkup package — a fixed set of lab tests sold together at one price. */
@Entity
@Table(name = "lab_packages")
@Getter
@Setter
@NoArgsConstructor
public class LabPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "lab_package_tests", joinColumns = @JoinColumn(name = "package_id"), inverseJoinColumns = @JoinColumn(name = "test_id"))
    private Set<LabTest> tests = new HashSet<>();

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
}
