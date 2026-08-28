package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.MedicineCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicineCategoryRepository extends JpaRepository<MedicineCategory, Long> {
    List<MedicineCategory> findByOrganizationIsNull();
    List<MedicineCategory> findByOrganizationId(Long organizationId);
}
