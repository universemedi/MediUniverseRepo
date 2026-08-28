package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
}
