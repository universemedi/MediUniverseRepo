package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** e.g. ORG-000001 — backend-generated, immutable, never entered manually (spec §10). */
    @Column(name = "organization_code", nullable = false, unique = true, length = 20)
    private String organizationCode;

    /** e.g. abc-multispeciality-clinic — used for a future public/booking URL (spec §11). */
    @Column(nullable = false, unique = true, length = 180)
    private String slug;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(unique = true, length = 80)
    private String subdomain;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "org_type_id")
    private OrgType orgType;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrgStatus status = OrgStatus.TRIAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "creation_source", nullable = false, length = 20)
    private OrgCreationSource creationSource = OrgCreationSource.SUPER_ADMIN;

    @Column(length = 180)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "address_line1", length = 200)
    private String addressLine1;

    @Column(name = "address_line2", length = 200)
    private String addressLine2;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 100)
    private String country;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(nullable = false, length = 60)
    private String timezone = "Asia/Kolkata";

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(nullable = false, length = 10)
    private String language = "en";

    @Column(name = "gst_number", length = 30)
    private String gstNumber;

    @Column(name = "registration_number", length = 60)
    private String registrationNumber;

    @Column(length = 200)
    private String website;

    @Column(name = "logo_url", length = 400)
    private String logoUrl;

    @Column(name = "renews_on")
    private LocalDate renewsOn;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }
}
