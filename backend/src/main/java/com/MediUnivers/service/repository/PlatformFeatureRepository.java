package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.PlatformFeature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlatformFeatureRepository extends JpaRepository<PlatformFeature, Long> {
    Optional<PlatformFeature> findByCode(String code);
}
