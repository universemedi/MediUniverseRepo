package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A testimonial shown on MediUnivers' own public website — see {@link WebsiteTestimonial} for the tenant-site equivalent. */
@Entity
@Table(name = "platform_testimonials")
@Getter
@Setter
@NoArgsConstructor
public class PlatformTestimonial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "role_company", length = 160)
    private String roleCompany;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private int rating = 5;

    @Column(name = "photo_url", length = 400)
    private String photoUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean published = true;
}
