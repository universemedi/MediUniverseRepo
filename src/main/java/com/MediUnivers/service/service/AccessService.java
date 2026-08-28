package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Server-side mirror of the frontend's usePermissions() hook
 * (src/hooks/usePermissions.ts). The frontend hides UI based on this same
 * logic, but the frontend can be tampered with — every write/read that
 * matters is re-checked here so the API is the real source of truth.
 *
 *   Organization Type -> which business modules exist for this org at all
 *   Subscription Plan  -> which of those modules are currently paid for
 *   Role                -> which pages within the unlocked modules are allowed
 */
@Service
public class AccessService {

    public enum Reason { OK, ROLE, PLAN, PORTAL, UNAVAILABLE }

    public boolean orgTypeAllowsGroup(OrgType orgType, ModuleGroup group) {
        if (group == ModuleGroup.PLATFORM) return false;
        return orgType.getModules().contains(group);
    }

    public boolean planAllowsGroup(Plan plan, ModuleGroup group) {
        if (group == ModuleGroup.PLATFORM) return false;
        return plan.getModules().contains(group);
    }

    public boolean roleAllowsGroup(Role role, ModuleGroup group) {
        return role.getGroupAccess().stream().anyMatch(a -> a.getModuleGroup() == group);
    }

    public boolean roleAllowsPath(Role role, ModuleGroup group, String path) {
        return role.getGroupAccess().stream()
                .filter(a -> a.getModuleGroup() == group)
                .findFirst()
                .map(a -> a.isWildcard() || a.getPaths().contains(path))
                .orElse(false);
    }

    public boolean roleCan(Role role, ActionType action) {
        return role.getActions().contains(action);
    }

    /** Full reason computation for a (role, org) pair trying to reach a module group. */
    public Reason reasonForGroup(Role role, Organization organization, ModuleGroup group) {
        boolean isPlatform = role.getPortal() == Portal.PLATFORM;
        if (group == ModuleGroup.PLATFORM && !isPlatform) return Reason.PORTAL;
        if (!roleAllowsGroup(role, group)) return Reason.ROLE;

        boolean isBusinessModule = !isPlatform && group != ModuleGroup.PATIENT
                && group != ModuleGroup.PLATFORM && group != ModuleGroup.ORG && group != ModuleGroup.BILLING;
        if (isBusinessModule) {
            if (organization == null) return Reason.UNAVAILABLE;
            if (!orgTypeAllowsGroup(organization.getOrgType(), group)) return Reason.UNAVAILABLE;
            if (!planAllowsGroup(organization.getPlan(), group)) return Reason.PLAN;
        }
        return Reason.OK;
    }

    public Reason reasonForPath(Role role, Organization organization, ModuleGroup group, String path) {
        Reason groupReason = reasonForGroup(role, organization, group);
        if (groupReason != Reason.OK) return groupReason;
        return roleAllowsPath(role, group, path) ? Reason.OK : Reason.ROLE;
    }

    public boolean canAccessPath(AppUser user, ModuleGroup group, String path) {
        return reasonForPath(user.getRole(), user.getOrganization(), group, path) == Reason.OK;
    }

    /**
     * Used by clinic/pharmacy/lab/crm/cms services before any write or sensitive
     * read — this is the defense-in-depth backstop behind the role check every
     * @PreAuthorize already does at the controller layer: even a user whose ROLE
     * would allow the module can't use it if the org's business type doesn't run
     * it, or the current plan doesn't pay for it.
     */
    public void requireModuleEnabled(Organization organization, ModuleGroup group) {
        if (organization == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        // Business modules go dark when the subscription is suspended/cancelled — the
        // Org Owner can still log in and reach ORG/BILLING to resolve it (spec §13),
        // but Clinic/Pharmacy/Lab/CRM/CMS stay blocked for everyone until they do.
        if (organization.getStatus() == OrgStatus.SUSPENDED || organization.getStatus() == OrgStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This organization's subscription is " + organization.getStatus().name().toLowerCase()
                            + ". An owner needs to resolve billing before " + group + " is usable again.");
        }
        if (!orgTypeAllowsGroup(organization.getOrgType(), group)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This organization's business type does not include " + group + ".");
        }
        if (!planAllowsGroup(organization.getPlan(), group)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    group + " is not included in the current subscription plan.");
        }
    }
}
