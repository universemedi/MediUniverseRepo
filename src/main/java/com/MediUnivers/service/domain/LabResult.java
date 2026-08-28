package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "lab_results")
@Getter
@Setter
@NoArgsConstructor
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id")
    private LabOrderItem orderItem;

    @Column(name = "result_value", nullable = false, length = 100)
    private String resultValue;

    @Column(length = 20)
    private String unit;

    @Column(length = 300)
    private String remarks;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ResultFlag flag = ResultFlag.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ResultStatus status = ResultStatus.ENTERED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entered_by")
    private AppUser enteredBy;

    @Column(name = "entered_at", nullable = false)
    private Instant enteredAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private AppUser verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;
}
