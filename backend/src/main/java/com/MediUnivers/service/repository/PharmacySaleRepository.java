package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PharmacySale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface PharmacySaleRepository extends JpaRepository<PharmacySale, Long> {
    List<PharmacySale> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<PharmacySale> findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(Long organizationId, Instant after);
    List<PharmacySale> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}
