package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "website_testimonials")
@Getter
@Setter
@NoArgsConstructor
public class WebsiteTestimonial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    @Column(name = "patient_name", nullable = false, length = 120)
    private String patientName;

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
