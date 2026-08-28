package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.WebsiteContactSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebsiteContactSubmissionRepository extends JpaRepository<WebsiteContactSubmission, Long> {
    List<WebsiteContactSubmission> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
}
