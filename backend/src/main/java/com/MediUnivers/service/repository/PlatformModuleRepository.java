package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PlatformModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatformModuleRepository extends JpaRepository<PlatformModule, Long> {
    Optional<PlatformModule> findByCode(String code);
}
