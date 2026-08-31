import { useMemo } from "react";
import { useAppSelector } from "@/store";
import {
  ROLES,
  roleAllowsGroup,
  roleAllowsPath,
  roleCan,
  type Action,
  type ModuleGroup,
  type RoleDef,
} from "@/lib/rbac";
import { MODULES } from "@/config/modules";

export type AccessReason = "ok" | "role" | "plan" | "portal" | "unavailable";

export function usePermissions() {
  const roleKey = useAppSelector((s) => s.auth.user?.role ?? "SUPER_ADMIN");
  const tenant = useAppSelector((s) => s.tenant);

  const def = useMemo<RoleDef>(() => {
    const system = ROLES.find((r) => r.key === roleKey);
    if (system) return system;
    const custom = tenant.customRoles.find((r) => r.key === roleKey);
    if (custom) {
      return {
        key: custom.key,
        name: custom.name,
        portal: "tenant",
        description: custom.description,
        system: true,
        access: custom.access,
        actions: custom.actions as Action[],
      };
    }
    return ROLES[0] as RoleDef;
  }, [roleKey, tenant.customRoles]);

  // Real plan/org-type data hydrated from the organization returned at login
  // (see tenantSlice.hydrateFromOrganization) — not a static lookup table, so
  // this always agrees with what the backend actually enforces.
  const plan = {
    code: tenant.planCode,
    name: tenant.planName,
    price: tenant.planPrice,
    tagline: tenant.planTagline,
    modules: tenant.planModules,
    limits: tenant.planLimits,
    highlights: tenant.planHighlights,
  };
  const orgType = {
    code: tenant.orgTypeCode,
    name: tenant.orgTypeName,
    description: tenant.orgTypeDescription,
    modules: tenant.orgTypeModules,
  };
  const isPlatform = def.portal === "platform";

  const orgTypeAllowsGroup = (group: string) =>
    group !== "platform" && tenant.orgTypeModules.includes(group as ModuleGroup);
  const planAllowsGroup = (group: string) =>
    group !== "platform" && tenant.planModules.includes(group as ModuleGroup);

  /** why a module group is (not) reachable for the current identity */
  const reasonForGroup = (group: string): AccessReason => {
    if (group === "platform" && !isPlatform) return "portal";
    if (!roleAllowsGroup(def, group)) return "role";
    const isBusinessModule =
      !isPlatform &&
      group !== "patient" &&
      group !== "platform" &&
      group !== "org" &&
      group !== "billing";
    if (isBusinessModule && !orgTypeAllowsGroup(group)) return "unavailable";
    if (isBusinessModule && !planAllowsGroup(group)) return "plan";
    return "ok";
  };

  const reasonForPath = (path: string): AccessReason => {
    const mod = MODULES.find((m) => m.path === path);
    if (!mod) return "role";
    const groupReason = reasonForGroup(mod.group);
    if (groupReason !== "ok") return groupReason;
    return roleAllowsPath(def, mod.group, path) ? "ok" : "role";
  };

  return {
    role: def.key,
    roleDef: def,
    roleName: def.name,
    portal: def.portal,
    plan,
    planCode: tenant.planCode,
    orgType,
    orgTypeCode: tenant.orgTypeCode,
    orgName: isPlatform ? "MediUnivers Platform" : tenant.orgName,
    isPlatform,
    reasonForGroup,
    reasonForPath,
    canAccess: (group: string) => reasonForGroup(group) === "ok",
    canAccessPath: (path: string) => reasonForPath(path) === "ok",
    /** locked by subscription but the role + org type would otherwise allow it */
    isPlanLocked: (group: string) => reasonForGroup(group) === "plan",
    /** not part of this organization's business at all (e.g. no in-house pharmacy) */
    isUnavailable: (group: string) => reasonForGroup(group) === "unavailable",
    can: (action: Action) => roleCan(def, action),
  };
}
