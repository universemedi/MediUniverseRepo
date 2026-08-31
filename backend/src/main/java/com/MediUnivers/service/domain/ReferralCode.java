package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Future-ready referral programme — disabled ({@code enabled=false}) by default until the reward-crediting flow ships. */
@Entity
@Table(name = "referral_codes")
@Getter
@Setter
@NoArgsConstructor
public class ReferralCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(name = "reward_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal rewardAmount = BigDecimal.ZERO;

    @Column(name = "signup_count", nullable = false)
    private int signupCount = 0;

    @Column(nullable = false)
    private boolean enabled = false;
}
