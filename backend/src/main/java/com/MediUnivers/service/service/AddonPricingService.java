package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AddonPricing;
import com.MediUnivers.service.domain.AddonType;
import com.MediUnivers.service.dto.AddonPricingDto;
import com.MediUnivers.service.dto.UpdateAddonPricingRequest;
import com.MediUnivers.service.repository.AddonPricingRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/** Super-admin-configured addon rates — the fixed set of AddonType values, price/active editable, mirrors ModulePriceService. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddonPricingService {

    private final AddonPricingRepository repository;

    /** Public catalog for checkout — active only. */
    public List<AddonPricingDto> listActive() {
        return repository.findAllByOrderByAddonTypeAsc().stream()
                .filter(AddonPricing::isActive)
                .map(this::toDto).toList();
    }

    /** Platform admin view — every configured addon, active or not. */
    public List<AddonPricingDto> listAllForAdmin() {
        return repository.findAllByOrderByAddonTypeAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public AddonPricingDto update(String addonTypeCode, UpdateAddonPricingRequest request) {
        AddonType type = AddonType.valueOf(addonTypeCode.toUpperCase(Locale.ROOT));
        AddonPricing pricing = repository.findByAddonType(type)
                .orElseThrow(() -> new EntityNotFoundException("No addon pricing configured for " + addonTypeCode));
        pricing.setPricePerUnitMonthly(request.pricePerUnitMonthly());
        pricing.setPricePerUnitYearly(request.pricePerUnitYearly());
        pricing.setActive(request.active());
        return toDto(repository.save(pricing));
    }

    private AddonPricingDto toDto(AddonPricing p) {
        return new AddonPricingDto(p.getAddonType().name(), p.getLabel(), p.isQuantityBased(), p.getUnitLabel(),
                p.getPricePerUnitMonthly(), p.getPricePerUnitYearly(), p.isActive());
    }
}
