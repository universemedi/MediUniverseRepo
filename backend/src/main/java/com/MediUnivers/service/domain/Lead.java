package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/** Every public-website form (Contact, Request Demo, Free Trial, Pricing Enquiry) lands here. */
@Entity
@Table(name = "leads")
@Getter
@Setter
@NoArgsConstructor
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String source;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(name = "organization_name", length = 160)
    private String organizationName;

    @Column(name = "organization_type", length = 40)
    private String organizationType;

    @Column(length = 120)
    private String city;

    @Column(name = "expected_branches")
    private Integer expectedBranches;

    @Column(name = "expected_users")
    private Integer expectedUsers;

    @Column(name = "modules_of_interest", length = 200)
    private String modulesOfInterest;

    @Column(name = "preferred_demo_date")
    private LocalDate preferredDemoDate;

    @Column(length = 2000)
    private String message;

    @Column(name = "internal_notes", length = 2000)
    private String internalNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private AppUser assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LeadStatus status = LeadStatus.NEW_LEAD;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
