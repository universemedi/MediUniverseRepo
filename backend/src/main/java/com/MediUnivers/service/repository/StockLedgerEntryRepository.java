package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.StockLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockLedgerEntryRepository extends JpaRepository<StockLedgerEntry, Long> {
    List<StockLedgerEntry> findByMedicineIdAndBranchIdOrderByCreatedAtDesc(Long medicineId, Long branchId);
}
