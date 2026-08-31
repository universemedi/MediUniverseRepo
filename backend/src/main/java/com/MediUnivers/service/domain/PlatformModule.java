package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Marketing-facing catalog of feature modules (Clinic, Pharmacy, ...) shown on the platform's own admin console — distinct from the {@link ModuleGroup} enum, which is the code-level RBAC bucket. */
@Entity
@Table(name = "platform_modules")
@Getter
@Setter
@NoArgsConstructor
public class PlatformModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 30)
    private String category = "CORE";

    @Column(nullable = false)
    private boolean active = true;
}
