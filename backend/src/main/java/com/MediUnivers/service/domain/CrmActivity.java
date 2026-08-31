package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Append-only timeline entry — never updated or deleted. */
@Entity
@Table(name = "crm_activities")
@Getter
@Setter
@NoArgsConstructor
public class CrmActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id")
    private CrmLead lead;

    @Column(name = "activity_type", nullable = false, length = 20)
    private String activityType = "NOTE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
