package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Subscription plan — which modules (that the org type allows) are currently unlocked. */
@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "price_label", nullable = false, length = 60)
    private String priceLabel;

    @Column(length = 300)
    private String tagline;

    @Column(name = "max_branches", nullable = false)
    private int maxBranches;

    @Column(name = "max_users", nullable = false)
    private int maxUsers;

    @Column(name = "storage_label", nullable = false, length = 30)
    private String storageLabel;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plan_modules", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "module_group")
    @Enumerated(EnumType.STRING)
    private Set<ModuleGroup> modules = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plan_highlights", joinColumns = @JoinColumn(name = "plan_id"))
    @Column(name = "label")
    private List<String> highlights = new ArrayList<>();
}
