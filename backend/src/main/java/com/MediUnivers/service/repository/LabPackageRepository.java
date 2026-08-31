package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.LabPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabPackageRepository extends JpaRepository<LabPackage, Long> {
    List<LabPackage> findByOrganizationId(Long organizationId);
}
