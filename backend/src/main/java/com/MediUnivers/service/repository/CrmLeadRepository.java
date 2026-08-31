package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.CrmLead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CrmLeadRepository extends JpaRepository<CrmLead, Long> {
    List<CrmLead> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
}
