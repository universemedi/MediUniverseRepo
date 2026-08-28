package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebsiteServiceItemRepository extends JpaRepository<WebsiteServiceItem, Long> {
    List<WebsiteServiceItem> findByOrganizationIdOrderBySortOrderAsc(Long organizationId);
    List<WebsiteServiceItem> findByOrganizationIdAndActiveTrueOrderBySortOrderAsc(Long organizationId);
}
