package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * What kind of business an organization runs (Clinic only, Clinic + Pharmacy,
 * Multi-speciality, Standalone Pharmacy, Standalone Lab, ...). This is the
 * layer ABOVE the subscription plan: it defines which modules could ever
 * apply to the org, regardless of what they've paid for.
 */
@Entity
@Table(name = "org_types")
@Getter
@Setter
@NoArgsConstructor
public class OrgType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 400)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "org_type_modules", joinColumns = @JoinColumn(name = "org_type_id"))
    @Column(name = "module_group")
    @Enumerated(EnumType.STRING)
    private Set<ModuleGroup> modules = new HashSet<>();

    @Column(nullable = false)
    private boolean active = true;
}
