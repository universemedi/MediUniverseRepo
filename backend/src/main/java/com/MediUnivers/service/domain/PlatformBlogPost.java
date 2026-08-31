package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A blog post published on MediUnivers' own public website — see {@link WebsiteBlogPost} for the tenant-site equivalent. */
@Entity
@Table(name = "platform_blog_posts")
@Getter
@Setter
@NoArgsConstructor
public class PlatformBlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 220)
    private String slug;

    @Column(length = 400)
    private String excerpt;

    @Column(nullable = false, length = 8000)
    private String content;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(length = 120)
    private String author;

    @Column(nullable = false)
    private boolean published = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;
}
