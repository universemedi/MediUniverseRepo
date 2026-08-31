package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.CrmLeadSource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrmLeadSourceRepository extends JpaRepository<CrmLeadSource, Long> {
    List<CrmLeadSource> findByOrganizationId(Long organizationId);
}
