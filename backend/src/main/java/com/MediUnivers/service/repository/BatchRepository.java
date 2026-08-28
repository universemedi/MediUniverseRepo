package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.Batch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByMedicineIdAndBranchIdOrderByExpiryDateAsc(Long medicineId, Long branchId);

    /** FIFO/FEFO allocation source: oldest-expiring, non-expired, in-stock batches first — row-locked for concurrent sales. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Batch b where b.medicine.id = :medicineId and b.branch.id = :branchId "
            + "and b.quantityAvailable > 0 and b.expiryDate >= :today order by b.expiryDate asc, b.receivedAt asc")
    List<Batch> lockAllocatableBatches(@Param("medicineId") Long medicineId, @Param("branchId") Long branchId, @Param("today") LocalDate today);

    List<Batch> findByOrganizationIdAndBranchId(Long organizationId, Long branchId);

    @Query("select b from Batch b where b.organization.id = :orgId and b.expiryDate <= :cutoff and b.quantityAvailable > 0 order by b.expiryDate asc")
    List<Batch> findExpiringSoon(@Param("orgId") Long organizationId, @Param("cutoff") LocalDate cutoff);
}
