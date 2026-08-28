package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.dto.OrgModuleStatusDto;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Computes each business module's effective status for an organization —
 * "Organizations inherit plan configuration" (spec rule #9): a module is
 * only truly enabled when the org's business TYPE includes it AND the
 * current PLAN pays for it. This is what drives the Org Owner's "Configure
 * Modules" screen, and what AccessService also checks before letting anyone
 * into a page.
 */
@Service
public class OrgModuleService {

    private static final List<ModuleGroup> BUSINESS_MODULES =
            List.of(ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);

    public List<OrgModuleStatusDto> statusFor(Organization organization) {
        return BUSINESS_MODULES.stream()
                .map(group -> {
                    boolean byOrgType = organization.getOrgType().getModules().contains(group);
                    boolean byPlan = organization.getPlan().getModules().contains(group);
                    return new OrgModuleStatusDto(group, byOrgType, byPlan, byOrgType && byPlan);
                })
                .toList();
    }
}
