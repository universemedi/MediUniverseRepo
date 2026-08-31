package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.OrganizationCommunicationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrganizationCommunicationSettingsRepository extends JpaRepository<OrganizationCommunicationSettings, Long> {
    Optional<OrganizationCommunicationSettings> findByOrganizationId(Long organizationId);
}
