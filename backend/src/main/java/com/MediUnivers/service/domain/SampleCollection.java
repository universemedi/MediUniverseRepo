package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Phase 1 simplification: one collection event per order (covering every
 * test on it), rather than a separate collection per sample type. A real
 * multi-sample-type order (e.g. blood + urine on the same visit) is recorded
 * as one collection with both sample types noted in remarks — splitting
 * that into per-sample-type tracking is future work.
 */
@Entity
@Table(name = "sample_collections")
@Getter
@Setter
@NoArgsConstructor
public class SampleCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private LabOrder order;

    @Column(name = "collection_number", nullable = false, length = 30)
    private String collectionNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collected_by")
    private AppUser collectedBy;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt = Instant.now();

    @Column(name = "sample_types", nullable = false, length = 200)
    private String sampleTypes;

    @Column(length = 300)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SampleStatus status = SampleStatus.COLLECTED;
}
