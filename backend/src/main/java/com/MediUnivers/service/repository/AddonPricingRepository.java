package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.AddonPricing;
import com.MediUnivers.service.domain.AddonType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddonPricingRepository extends JpaRepository<AddonPricing, Long> {
    List<AddonPricing> findAllByOrderByAddonTypeAsc();

    Optional<AddonPricing> findByAddonType(AddonType addonType);
}
