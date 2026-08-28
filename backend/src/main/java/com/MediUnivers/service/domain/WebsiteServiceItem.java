package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A tile on the public site's "Services" section — display only, not tied to billing/pricing. */
@Entity
@Table(name = "website_services")
@Getter
@Setter
@NoArgsConstructor
public class WebsiteServiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    /** a lucide-react icon name the frontend template already knows how to render */
    @Column(name = "icon_name", length = 40)
    private String iconName;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;
}
