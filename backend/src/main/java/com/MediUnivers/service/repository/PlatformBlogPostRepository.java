package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PlatformBlogPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlatformBlogPostRepository extends JpaRepository<PlatformBlogPost, Long> {
    List<PlatformBlogPost> findAllByOrderByCreatedAtDesc();
    List<PlatformBlogPost> findByPublishedTrueOrderByPublishedAtDesc();
    Optional<PlatformBlogPost> findBySlugAndPublishedTrue(String slug);
    boolean existsBySlug(String slug);
}
