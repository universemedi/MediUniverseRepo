package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByOrganizationId(Long organizationId);
}
