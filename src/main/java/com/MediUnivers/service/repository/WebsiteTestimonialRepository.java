package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteTestimonial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebsiteTestimonialRepository extends JpaRepository<WebsiteTestimonial, Long> {
    List<WebsiteTestimonial> findByOrganizationIdOrderBySortOrderAsc(Long organizationId);
    List<WebsiteTestimonial> findByOrganizationIdAndPublishedTrueOrderBySortOrderAsc(Long organizationId);
}
