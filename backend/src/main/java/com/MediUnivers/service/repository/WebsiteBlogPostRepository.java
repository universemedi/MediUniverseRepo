package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteBlogPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WebsiteBlogPostRepository extends JpaRepository<WebsiteBlogPost, Long> {
    List<WebsiteBlogPost> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<WebsiteBlogPost> findByOrganizationIdAndPublishedTrueOrderByPublishedAtDesc(Long organizationId);
    Optional<WebsiteBlogPost> findByOrganizationIdAndSlug(Long organizationId, String slug);
    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);
}
