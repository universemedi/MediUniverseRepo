package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * One row per organization per subscription period — start/end date, a price
 * snapshot independent of whatever the Plan catalog row looks like later, and
 * (for free trials) how many days it was granted for. Organization.plan /
 * renewsOn stay a denormalized pointer to whichever Subscription here is
 * currently ACTIVE, so existing read paths never need to change.
 */
@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    /** Snapshots so a later edit/deactivation of the Plan catalog row doesn't rewrite this subscription's history. */
    @Column(name = "plan_code_snapshot", nullable = false, length = 50)
    private String planCodeSnapshot;

    @Column(name = "plan_name_snapshot", nullable = false, length = 120)
    private String planNameSnapshot;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 10)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    @Column(name = "is_free_trial", nullable = false)
    private boolean freeTrial = false;

    @Column(name = "free_trial_days")
    private Integer freeTrialDays;

    @Column(name = "price_without_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceWithoutTax = BigDecimal.ZERO;

    @Column(name = "tax_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercent = BigDecimal.ZERO;

    @Column(name = "price_with_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceWithTax = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status = SubscriptionStatus.PENDING_PAYMENT;

    @Column(name = "payment_gateway", length = 30)
    private String paymentGateway;

    /** How a directly-sold subscription (no online gateway involved) was actually paid — CASH, BANK_TRANSFER, UPI, CHEQUE. Null for gateway-paid subscriptions. */
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    @Column(name = "gateway_payment_id", length = 100)
    private String gatewayPaymentId;

    /** One-time "expiring soon" reminder already sent for this period — keeps the daily lifecycle job from resending it every run during the reminder window. */
    @Column(name = "expiry_reminder_sent", nullable = false)
    private boolean expiryReminderSent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<SubscriptionAddon> addons = new ArrayList<>();

    public void addAddon(SubscriptionAddon addon) {
        addon.setSubscription(this);
        this.addons.add(addon);
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
