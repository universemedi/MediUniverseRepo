package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.LabOrder;
import com.MediUnivers.service.domain.LabOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {
    List<LabOrder> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
    List<LabOrder> findByOrganizationIdAndStatusInOrderByCreatedAtDesc(Long organizationId, List<LabOrderStatus> statuses);
    List<LabOrder> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    long countByOrganizationIdAndStatus(Long organizationId, LabOrderStatus status);

    /** Cross-organization count — platform dashboard only, never tenant-scoped. */
    long countByStatusIn(List<LabOrderStatus> statuses);
}
