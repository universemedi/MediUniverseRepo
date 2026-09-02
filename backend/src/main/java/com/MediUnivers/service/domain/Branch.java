package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "is_head_office", nullable = false)
    private boolean headOffice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BranchStatus status = BranchStatus.ACTIVE;

    /** which business types this specific branch runs — a subset of what the org type allows overall */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "branch_modules", joinColumns = @JoinColumn(name = "branch_id"))
    @Column(name = "module_group")
    @Enumerated(EnumType.STRING)
    private java.util.Set<ModuleGroup> enabledModules = new java.util.HashSet<>();

    @Column(length = 180)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "address_line1", length = 200)
    private String addressLine1;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String country;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    /** Same shape as OrganizationSettings#businessHoursJson — a branch can run different hours
     * than the org-wide default (e.g. a satellite clinic closed Sundays). Null means "use the
     * organization's own business hours". */
    @Column(name = "business_hours_json", length = 2000)
    private String businessHoursJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
