package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.OrganizationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationSettingsRepository extends JpaRepository<OrganizationSettings, Long> {
    Optional<OrganizationSettings> findByOrganizationId(Long organizationId);
}
