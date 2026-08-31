package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Plan;
import com.MediUnivers.service.dto.CreatePlanRequest;
import com.MediUnivers.service.dto.PlanDto;
import com.MediUnivers.service.dto.UpdatePlanRequest;
import com.MediUnivers.service.repository.PlanRepository;
import com.MediUnivers.service.repository.SubscriptionRepository;
import com.MediUnivers.service.domain.SubscriptionStatus;
import com.MediUnivers.service.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanService {

    /** Reserved, non-public placeholder every new account gets before choosing a real plan — never shown to admins or customers. */
    private static final String UNSUBSCRIBED_PLAN_CODE = "UNSUBSCRIBED";

    private final PlanRepository repository;
    private final SubscriptionRepository subscriptionRepository;
    private final AuditLogService auditLogService;
    private final CurrentUserService currentUserService;

    /** Public catalog — active plans currently inside their availability window only (req #1). */
    public List<PlanDto> listAll() {
        java.time.LocalDate today = java.time.LocalDate.now();
        return repository.findAll().stream()
                .filter(Plan::isActive)
                .filter(p -> p.getValidFrom() == null || !today.isBefore(p.getValidFrom()))
                .filter(p -> p.getValidTo() == null || !today.isAfter(p.getValidTo()))
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(DtoMapper::toDto).toList();
    }

    /** Platform admin view — every real, catalog-worthy plan (excludes the reserved UNSUBSCRIBED placeholder and per-org CUSTOM-* plans). */
    public List<PlanDto> listAllForAdmin() {
        return repository.findAll().stream()
                .filter(p -> !UNSUBSCRIBED_PLAN_CODE.equals(p.getCode()) && !p.getCode().startsWith("CUSTOM-"))
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(DtoMapper::toDto).toList();
    }

    public Plan requireByCode(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Unknown plan: " + code));
    }

    @Transactional
    public PlanDto create(CreatePlanRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A plan with this code already exists.");
        }
        requireValidWindow(request.validFrom(), request.validTo());
        Plan p = new Plan();
        p.setCode(request.code());
        applyFields(p, request.name(), request.tagline(), request.maxBranches(), request.maxUsers(),
                request.maxDoctorsPerBranch(), request.storageLabel(), request.priceWithoutTax(), request.taxPercent(),
                request.freeTrial(), request.freeTrialDays(), true, request.validFrom(), request.validTo(),
                request.modules(), request.highlights());
        p.setSortOrder(repository.findAll().size());
        p.setPriceLabel(formatPriceLabel(request.priceWithoutTax(), request.freeTrial(), request.freeTrialDays()));
        Plan saved = repository.save(p);
        auditLogService.record(currentUserService.require(), "CREATED", "PLAN", saved.getCode(), null);
        return DtoMapper.toDto(saved);
    }

    @Transactional
    public PlanDto update(Long id, UpdatePlanRequest request) {
        Plan p = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));
        requireNotReserved(p);
        requireValidWindow(request.validFrom(), request.validTo());
        applyFields(p, request.name(), request.tagline(), request.maxBranches(), request.maxUsers(),
                request.maxDoctorsPerBranch(), request.storageLabel(), request.priceWithoutTax(), request.taxPercent(),
                request.freeTrial(), request.freeTrialDays(), request.active(), request.validFrom(), request.validTo(),
                request.modules(), request.highlights());
        p.setPriceLabel(formatPriceLabel(request.priceWithoutTax(), request.freeTrial(), request.freeTrialDays()));
        Plan saved = repository.save(p);
        auditLogService.record(currentUserService.require(), "UPDATED", "PLAN", saved.getCode(), null);
        return DtoMapper.toDto(saved);
    }

    private void requireValidWindow(java.time.LocalDate validFrom, java.time.LocalDate validTo) {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date can't be before the start date.");
        }
    }

    /** Soft delete — plans are FK'd from Organization/Subscription history and are never physically removed. */
    @Transactional
    public void deactivate(Long id) {
        Plan p = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));
        requireNotReserved(p);
        if (subscriptionRepository.existsByPlanIdAndStatus(id, SubscriptionStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This plan has active subscriptions — it can't be deactivated while organizations are on it.");
        }
        p.setActive(false);
        repository.save(p);
    }

    private void requireNotReserved(Plan p) {
        if (UNSUBSCRIBED_PLAN_CODE.equals(p.getCode()) || p.getCode().startsWith("CUSTOM-")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This is a reserved system plan and can't be modified.");
        }
    }

    private void applyFields(Plan p, String name, String tagline, int maxBranches, int maxUsers, int maxDoctorsPerBranch,
                              String storageLabel, java.math.BigDecimal priceWithoutTax, java.math.BigDecimal taxPercent,
                              boolean freeTrial, int freeTrialDays, boolean active,
                              java.time.LocalDate validFrom, java.time.LocalDate validTo,
                              java.util.Set<com.MediUnivers.service.domain.ModuleGroup> modules, List<String> highlights) {
        p.setName(name);
        p.setTagline(tagline);
        p.setMaxBranches(maxBranches);
        p.setMaxUsers(maxUsers);
        p.setMaxDoctorsPerBranch(maxDoctorsPerBranch);
        p.setStorageLabel(storageLabel);
        p.setPriceWithoutTax(priceWithoutTax);
        p.setTaxPercent(taxPercent);
        p.setFreeTrial(freeTrial);
        p.setFreeTrialDays(freeTrialDays);
        p.setActive(active);
        p.setValidFrom(validFrom);
        p.setValidTo(validTo);
        p.getModules().clear();
        if (modules != null) p.getModules().addAll(modules);
        p.getHighlights().clear();
        if (highlights != null) p.getHighlights().addAll(highlights);
    }

    private String formatPriceLabel(java.math.BigDecimal priceWithoutTax, boolean freeTrial, int freeTrialDays) {
        if (freeTrial) return "₹0 / " + freeTrialDays + " days";
        if (priceWithoutTax == null || priceWithoutTax.signum() == 0) return "Custom";
        return "₹" + priceWithoutTax.stripTrailingZeros().toPlainString() + " / month";
    }
}
