package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A granular, marketing-facing feature flag belonging to a {@link ModuleGroup}. */
@Entity
@Table(name = "platform_features")
@Getter
@Setter
@NoArgsConstructor
public class PlatformFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_group", nullable = false, length = 20)
    private ModuleGroup moduleGroup;

    @Column(name = "feature_type", nullable = false, length = 20)
    private String featureType = "BOOLEAN";

    @Column(nullable = false)
    private boolean active = true;
}
