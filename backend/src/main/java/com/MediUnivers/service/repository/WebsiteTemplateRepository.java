package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.TemplateAudience;
import com.MediUnivers.service.domain.WebsiteTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebsiteTemplateRepository extends JpaRepository<WebsiteTemplate, Long> {
    List<WebsiteTemplate> findByAudienceAndActiveTrueOrderBySortOrderAsc(TemplateAudience audience);

    List<WebsiteTemplate> findAllByOrderByAudienceAscSortOrderAsc();
}
