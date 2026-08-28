package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
    List<Manufacturer> findByOrganizationIsNull();
    List<Manufacturer> findByOrganizationId(Long organizationId);
}
