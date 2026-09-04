package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Super-admin-configured rate for one {@link AddonType} — mirrors {@link ModulePrice}'s pattern (fixed set, price/active editable, never created or deleted). */
@Entity
@Table(name = "addon_pricing")
@Getter
@Setter
@NoArgsConstructor
public class AddonPricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "addon_type", nullable = false, unique = true, length = 30)
    private AddonType addonType;

    @Column(nullable = false, length = 120)
    private String label;

    /** false for SMS/WHATSAPP/PAYMENT_GATEWAY (a plain on-off unlock, quantity always 1); true for the limit-raising addons. */
    @Column(name = "quantity_based", nullable = false)
    private boolean quantityBased = false;

    /** What one unit represents, shown next to the quantity picker — e.g. "branch", "doctor per branch", "5 GB". Null for toggle addons. */
    @Column(name = "unit_label", length = 60)
    private String unitLabel;

    @Column(name = "price_per_unit_monthly", nullable = false, precision = 12, scale = 2)
    private BigDecimal pricePerUnitMonthly = BigDecimal.ZERO;

    /** Null means no yearly rate configured yet — checkout falls back to monthly x 12. */
    @Column(name = "price_per_unit_yearly", precision = 12, scale = 2)
    private BigDecimal pricePerUnitYearly;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
