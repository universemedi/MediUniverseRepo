package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.SavedReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedReportRepository extends JpaRepository<SavedReport, Long> {
    List<SavedReport> findByOrganizationIdAndModuleGroupOrderByGeneratedAtDesc(Long organizationId, ModuleGroup moduleGroup);
}
