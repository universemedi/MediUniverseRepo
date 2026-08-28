package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PharmacyReturn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PharmacyReturnRepository extends JpaRepository<PharmacyReturn, Long> {
    List<PharmacyReturn> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<PharmacyReturn> findBySaleId(Long saleId);
}
