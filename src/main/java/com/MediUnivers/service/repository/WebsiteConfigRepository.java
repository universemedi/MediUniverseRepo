package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WebsiteConfigRepository extends JpaRepository<WebsiteConfig, Long> {
    Optional<WebsiteConfig> findByOrganizationId(Long organizationId);
    Optional<WebsiteConfig> findByOrganizationSlugAndPublishedTrue(String slug);
}
