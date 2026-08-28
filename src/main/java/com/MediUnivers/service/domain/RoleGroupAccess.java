package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * One row per module group a role can touch. wildcard=true means "every page
 * in this group is allowed"; otherwise the exact page paths are listed.
 */
@Entity
@Table(name = "role_group_access")
@Getter
@Setter
@NoArgsConstructor
public class RoleGroupAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id")
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_group", nullable = false, length = 20)
    private ModuleGroup moduleGroup;

    @Column(nullable = false)
    private boolean wildcard;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_access_paths", joinColumns = @JoinColumn(name = "role_group_access_id"))
    @Column(name = "path")
    private Set<String> paths = new HashSet<>();

    public static RoleGroupAccess wildcard(ModuleGroup group) {
        RoleGroupAccess a = new RoleGroupAccess();
        a.setModuleGroup(group);
        a.setWildcard(true);
        return a;
    }

    public static RoleGroupAccess paths(ModuleGroup group, String... paths) {
        RoleGroupAccess a = new RoleGroupAccess();
        a.setModuleGroup(group);
        a.setWildcard(false);
        a.getPaths().addAll(Set.of(paths));
        return a;
    }
}
