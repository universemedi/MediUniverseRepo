package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** One addon line attached to one {@link Subscription} period — renews (or doesn't) exactly when
 * that subscription does, same "snapshot the price, don't reference the catalog live" pattern
 * Subscription itself uses for its plan price. */
@Entity
@Table(name = "subscription_addons")
@Getter
@Setter
@NoArgsConstructor
public class SubscriptionAddon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    @Enumerated(EnumType.STRING)
    @Column(name = "addon_type", nullable = false, length = 30)
    private AddonType addonType;

    /** Always 1 for a toggle addon (SMS/WHATSAPP/PAYMENT_GATEWAY); the unit count for a quantity-based one. */
    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "unit_price_without_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceWithoutTax = BigDecimal.ZERO;

    @Column(name = "unit_price_with_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPriceWithTax = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
