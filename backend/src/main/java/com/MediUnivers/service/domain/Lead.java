package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

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

    @Column(length = 2000)
    private String message;

    @Column(nullable = false, length = 30)
    private String status = "NEW_LEAD";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
