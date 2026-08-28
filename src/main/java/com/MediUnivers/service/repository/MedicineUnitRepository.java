package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.MedicineUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicineUnitRepository extends JpaRepository<MedicineUnit, Long> {
    List<MedicineUnit> findByOrganizationIsNull();
    List<MedicineUnit> findByOrganizationId(Long organizationId);
}
