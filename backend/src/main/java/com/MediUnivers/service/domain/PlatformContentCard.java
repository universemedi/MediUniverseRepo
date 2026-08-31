package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A single marketing card on MediUnivers' own public website — see {@link PlatformContentSection}. */
@Entity
@Table(name = "platform_content_cards")
@Getter
@Setter
@NoArgsConstructor
public class PlatformContentCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlatformContentSection section;

    @Column(length = 60)
    private String icon;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 60)
    private String tag;

    @Column(length = 1000)
    private String description;

    /** Newline-separated bullet list — a feature group's items, or a solution's "wins". */
    @Column(name = "bullets_text", length = 2000)
    private String bulletsText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean published = true;
}
