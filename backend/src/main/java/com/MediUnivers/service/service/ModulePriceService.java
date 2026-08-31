package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.ModulePrice;
import com.MediUnivers.service.dto.ModulePriceDto;
import com.MediUnivers.service.dto.UpdateModulePriceRequest;
import com.MediUnivers.service.repository.ModulePriceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Per-module pricing a Super Admin configures, used to price a customer's own "build a plan" selection when none of the fixed plans fit. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ModulePriceService {

    private static final Map<ModuleGroup, String> LABELS = Map.of(
            ModuleGroup.CLINIC, "Clinic",
            ModuleGroup.PHARMACY, "Pharmacy",
            ModuleGroup.LAB, "Laboratory",
            ModuleGroup.CRM, "Patient CRM",
            ModuleGroup.CMS, "Website Builder"
    );

    private final ModulePriceRepository repository;

    /** Public catalog for the "build your own plan" calculator — active only. */
    public List<ModulePriceDto> listActive() {
        return repository.findAllByOrderByModuleGroupAsc().stream()
                .filter(ModulePrice::isActive)
                .map(this::toDto).toList();
    }

    /** Platform admin view — every configured module, active or not. */
    public List<ModulePriceDto> listAllForAdmin() {
        return repository.findAllByOrderByModuleGroupAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public ModulePriceDto update(String moduleGroupCode, UpdateModulePriceRequest request) {
        ModuleGroup group = ModuleGroup.valueOf(moduleGroupCode.toUpperCase(Locale.ROOT));
        ModulePrice price = repository.findByModuleGroup(group)
                .orElseThrow(() -> new EntityNotFoundException("No module price configured for " + moduleGroupCode));
        price.setPricePerMonth(request.pricePerMonth());
        price.setActive(request.active());
        return toDto(repository.save(price));
    }

    private ModulePriceDto toDto(ModulePrice p) {
        return new ModulePriceDto(p.getModuleGroup().name(), LABELS.getOrDefault(p.getModuleGroup(), p.getModuleGroup().name()),
                p.getPricePerMonth(), p.isActive());
    }
}
