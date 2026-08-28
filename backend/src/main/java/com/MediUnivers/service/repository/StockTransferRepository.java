package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {
    List<StockTransfer> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);
}
