package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {
    List<GoodsReceipt> findByOrganizationIdOrderByReceivedAtDesc(Long organizationId);
}
