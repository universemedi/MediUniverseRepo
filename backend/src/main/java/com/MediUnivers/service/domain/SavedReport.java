package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A saved report definition (name/category/period/status) — not a live BI engine, see V21 migration comment. */
@Entity
@Table(name = "saved_reports")
@Getter
@Setter
@NoArgsConstructor
public class SavedReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_group", nullable = false, length = 20)
    private ModuleGroup moduleGroup;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 20)
    private String period = "MONTHLY";

    @Column(nullable = false, length = 20)
    private String status = "READY";

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt = Instant.now();
}
