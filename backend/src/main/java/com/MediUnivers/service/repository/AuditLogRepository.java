package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
}
