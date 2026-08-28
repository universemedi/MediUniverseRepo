package com.MediUnivers.service.dto;

import com.MediUnivers.service.domain.ModuleGroup;

/**
 * Effective status of one business module for an organization — this is what
 * "Organizations inherit plan configuration" (product spec, RBAC section,
 * rule #9) means in practice: availableByOrgType says whether the org's
 * business even includes this module, availableByPlan says whether the
 * current subscription pays for it, and enabled = both true. The Org Owner's
 * "Configure Modules" screen is built entirely from this.
 */
public record OrgModuleStatusDto(
        ModuleGroup group,
        boolean availableByOrgType,
        boolean availableByPlan,
        boolean enabled
) {
}
