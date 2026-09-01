package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PharmacySale;
import com.MediUnivers.service.domain.SaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface PharmacySaleRepository extends JpaRepository<PharmacySale, Long> {
    List<PharmacySale> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<PharmacySale> findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(Long organizationId, Instant after);
    List<PharmacySale> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /** Cross-organization revenue for a window — platform dashboard only, never tenant-scoped. */
    @Query("select coalesce(sum(s.grandTotal), 0) from PharmacySale s "
            + "where s.status = :status and s.createdAt >= :start and s.createdAt < :end")
    BigDecimal sumGrandTotalByStatusAndCreatedAtBetween(
            @Param("status") SaleStatus status, @Param("start") Instant start, @Param("end") Instant end);
}
