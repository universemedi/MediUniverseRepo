package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A platform-managed catalog entry — an identity + default branding a
 * WebsiteConfig (org) or the singleton PlatformWebsiteConfig can pick.
 * Created and maintained only by platform super admins (req #9).
 */
@Entity
@Table(name = "website_templates")
@Getter
@Setter
@NoArgsConstructor
public class WebsiteTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TemplateAudience audience;

    @Column(length = 400)
    private String description;

    @Column(name = "preview_image_url", length = 500)
    private String previewImageUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
