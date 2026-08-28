package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Invoice;
import com.MediUnivers.service.domain.InvoiceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    List<Invoice> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<Invoice> findByOrganizationIdAndStatusOrderByCreatedAtDesc(Long organizationId, InvoiceStatus status);
    List<Invoice> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<Invoice> findByOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(Long organizationId, Instant after);
    long countByOrganizationIdAndStatus(Long organizationId, InvoiceStatus status);
}
