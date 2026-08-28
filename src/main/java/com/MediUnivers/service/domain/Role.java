package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A role is dynamic: system roles ship with the product and can be assigned
 * by any organization (organization == null); an org admin can also define
 * roles scoped to just their own organization (organization set).
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Portal portal;

    @Column(length = 300)
    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean system = true;

    /** null = system role, usable by every organization on this portal */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_actions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "action")
    @Enumerated(EnumType.STRING)
    private Set<ActionType> actions = new HashSet<>();

    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<RoleGroupAccess> groupAccess = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public void addGroupAccess(RoleGroupAccess access) {
        access.setRole(this);
        this.groupAccess.add(access);
    }
}
