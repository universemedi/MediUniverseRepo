package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.LabResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LabResultRepository extends JpaRepository<LabResult, Long> {
    Optional<LabResult> findByOrderItemId(Long orderItemId);
}
