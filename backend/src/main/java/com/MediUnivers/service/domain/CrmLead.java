package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** An organization's own patient/customer enquiry — distinct from {@link Lead}, which is MediUnivers' own sales pipeline for organizations signing up as customers. */
@Entity
@Table(name = "crm_leads")
@Getter
@Setter
@NoArgsConstructor
public class CrmLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(length = 180)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_id")
    private CrmLeadSource source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal value = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LeadStatus status = LeadStatus.NEW_LEAD;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
