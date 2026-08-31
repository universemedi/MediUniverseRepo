package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.ModulePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModulePriceRepository extends JpaRepository<ModulePrice, Long> {
    List<ModulePrice> findAllByOrderByModuleGroupAsc();
    Optional<ModulePrice> findByModuleGroup(ModuleGroup moduleGroup);
}
