package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.LabTestCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabTestCategoryRepository extends JpaRepository<LabTestCategory, Long> {
    List<LabTestCategory> findByOrganizationIsNull();
    List<LabTestCategory> findByOrganizationId(Long organizationId);
}
