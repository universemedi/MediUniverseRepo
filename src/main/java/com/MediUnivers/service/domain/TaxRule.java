package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * The GST/tax rate table every module picks its rate from — Volume 3 Part 4
 * §18 "Tax Rule Engine". Platform ships the standard Indian GST slabs
 * (0/5/12/18/28%) as read-only defaults; an organization can add its own on
 * top for anything else it needs (a service tax, a local levy, etc.).
 */
@Entity
@Table(name = "tax_rules")
@Getter
@Setter
@NoArgsConstructor
public class TaxRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 30)
    private String code;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(nullable = false)
    private boolean active = true;
}
