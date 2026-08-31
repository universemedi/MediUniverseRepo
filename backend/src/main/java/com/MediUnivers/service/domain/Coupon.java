package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "coupon_plans", joinColumns = @JoinColumn(name = "coupon_id"))
    @Column(name = "plan_code")
    private Set<String> planCodes = new HashSet<>();

    @Column(name = "usage_count", nullable = false)
    private int usageCount = 0;

    @Column(nullable = false)
    private boolean active = true;
}
