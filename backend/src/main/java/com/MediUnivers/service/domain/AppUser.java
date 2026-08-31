package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Portal portal;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id")
    private Role role;

    /** null for platform staff */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    /** ALL_BRANCHES ignores the selected set below entirely; SELECTED_BRANCHES uses it. */
    @Enumerated(EnumType.STRING)
    @Column(name = "branch_scope", nullable = false, length = 20)
    private BranchScope branchScope = BranchScope.ALL_BRANCHES;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_branches",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "branch_id"))
    private java.util.Set<Branch> selectedBranches = new java.util.HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /** set only while status == INVITED; cleared once the invite is accepted */
    @Column(name = "invite_token", length = 100)
    private String inviteToken;

    @Column(name = "invite_expires_at")
    private Instant inviteExpiresAt;

    /** Separate from inviteToken on purpose — this only makes sense while status == ACTIVE, an already-usable account that forgot its password. */
    @Column(name = "reset_token", length = 100)
    private String resetToken;

    @Column(name = "reset_token_expires_at")
    private Instant resetTokenExpiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }
}
