package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Per-module monthly rate a Super Admin sets, used to price a customer-built "custom plan" when none of the fixed plans fit. */
@Entity
@Table(name = "module_prices")
@Getter
@Setter
@NoArgsConstructor
public class ModulePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_group", nullable = false, unique = true, length = 20)
    private ModuleGroup moduleGroup;

    @Column(name = "price_per_month", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerMonth = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
