package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.AddonPricing;
import com.MediUnivers.service.domain.AddonType;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.SubscriptionAddon;
import com.MediUnivers.service.domain.SubscriptionStatus;
import com.MediUnivers.service.dto.SubscriptionAddonDto;
import com.MediUnivers.service.repository.AddonPricingRepository;
import com.MediUnivers.service.repository.SubscriptionAddonRepository;
import com.MediUnivers.service.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * What an organization's currently ACTIVE subscription's addons actually unlock — the single
 * place every "does this org have X" / "what's their effective limit" check goes through, so a
 * new enforcement point never has to re-derive this itself. Addons live on the Subscription row
 * (see SubscriptionAddon), so this always reflects whatever was purchased for the CURRENT period —
 * a lapsed/superseded subscription's addons stop counting the moment it does.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddonAccessService {

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionAddonRepository subscriptionAddonRepository;
    private final AddonPricingRepository addonPricingRepository;

    public List<SubscriptionAddon> currentAddons(Organization organization) {
        return subscriptionRepository
                .findFirstByOrganizationIdAndStatusOrderByStartDateDesc(organization.getId(), SubscriptionStatus.ACTIVE)
                .map(sub -> subscriptionAddonRepository.findBySubscriptionId(sub.getId()))
                .orElse(List.of());
    }

    public List<SubscriptionAddonDto> currentAddonDtos(Organization organization) {
        return currentAddons(organization).stream().map(this::toDto).toList();
    }

    public int quantity(Organization organization, AddonType type) {
        return currentAddons(organization).stream()
                .filter(a -> a.getAddonType() == type)
                .mapToInt(SubscriptionAddon::getQuantity)
                .sum();
    }

    public boolean hasAddon(Organization organization, AddonType type) {
        return quantity(organization, type) > 0;
    }

    public int effectiveMaxBranches(Organization organization) {
        return organization.getPlan().getMaxBranches() + quantity(organization, AddonType.EXTRA_CLINIC);
    }

    public int effectiveMaxUsers(Organization organization) {
        return organization.getPlan().getMaxUsers() + quantity(organization, AddonType.EXTRA_STAFF);
    }

    public int effectiveMaxDoctorsPerBranch(Organization organization) {
        return organization.getPlan().getMaxDoctorsPerBranch() + quantity(organization, AddonType.EXTRA_DOCTOR);
    }

    private SubscriptionAddonDto toDto(SubscriptionAddon a) {
        AddonPricing pricing = addonPricingRepository.findByAddonType(a.getAddonType()).orElse(null);
        String label = pricing != null ? pricing.getLabel() : a.getAddonType().name();
        boolean quantityBased = pricing != null && pricing.isQuantityBased();
        String unitLabel = pricing != null ? pricing.getUnitLabel() : null;
        BigDecimal lineTotal = a.getUnitPriceWithTax().multiply(BigDecimal.valueOf(a.getQuantity()));
        return new SubscriptionAddonDto(a.getAddonType().name(), label, quantityBased, unitLabel,
                a.getQuantity(), a.getUnitPriceWithTax(), lineTotal);
    }
}
