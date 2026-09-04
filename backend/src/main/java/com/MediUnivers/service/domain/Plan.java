package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Subscription plan — which modules (that the org type allows) are currently unlocked. */
@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "price_label", nullable = false, length = 60)
    private String priceLabel;

    @Column(length = 300)
    private String tagline;

    @Column(name = "max_branches", nullable = false)
    private int maxBranches;

    @Column(name = "max_users", nullable = false)
    private int maxUsers;

    @Column(name = "storage_label", nullable = false, length = 30)
    private String storageLabel;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "price_without_tax", nullable = false, precision = 12, scale = 2)
    private java.math.BigDecimal priceWithoutTax = java.math.BigDecimal.ZERO;

    @Column(name = "tax_percent", nullable = false, precision = 5, scale = 2)
    private java.math.BigDecimal taxPercent = java.math.BigDecimal.ZERO;

    /** Null means this plan isn't offered yearly yet — checkout falls back to priceWithoutTax x 12. */
    @Column(name = "price_without_tax_yearly", precision = 12, scale = 2)
    private java.math.BigDecimal priceWithoutTaxYearly;

    /** Doctor seats per branch — enforced the same way maxUsers already is (spec extension for req #7). */
    @Column(name = "max_doctors_per_branch", nullable = false)
    private int maxDoctorsPerBranch = 999;

    @Column(name = "is_free_trial", nullable = false)
    private boolean freeTrial = false;

    @Column(name = "free_trial_days", nullable = false)
    private int freeTrialDays = 0;

    /** Soft-delete flag — deactivated plans are hidden from GET /api/public/plans but never physically removed (they're FK'd from Organization/Subscription history). */
    @Column(nullable = false)
    private boolean active = true;

    /** The plan pre-selected on the public site's plan picker — at most one plan is ever true at a time (see PlanService). */
    @Column(name = "default_selected", nullable = false)
    private boolean defaultSelected = false;

    /** Optional availability window — null means always available. Existing subscribers already on this plan are unaffected once it lapses. */
    @Column(name = "valid_from")
    private java.time.LocalDate validFrom;

    @Column(name = "valid_to")
    private java.time.LocalDate validTo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plan_modules", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "module_group")
    @Enumerated(EnumType.STRING)
    private Set<ModuleGroup> modules = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plan_highlights", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "label")
    private List<String> highlights = new ArrayList<>();
}
