package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "crm_follow_ups")
@Getter
@Setter
@NoArgsConstructor
public class CrmFollowUp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id")
    private CrmLead lead;

    @Column(nullable = false, length = 20)
    private String type = "CALL";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private AppUser owner;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";
}
