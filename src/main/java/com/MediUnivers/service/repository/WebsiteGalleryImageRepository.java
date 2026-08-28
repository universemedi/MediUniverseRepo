package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteGalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebsiteGalleryImageRepository extends JpaRepository<WebsiteGalleryImage, Long> {
    List<WebsiteGalleryImage> findByOrganizationIdOrderBySortOrderAsc(Long organizationId);
}
