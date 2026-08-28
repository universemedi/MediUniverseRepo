import { useMemo } from "react";
import { useAppSelector } from "@/store";
import {
  ROLES,
  roleAllowsGroup,
  roleAllowsPath,
  roleCan,
  type Action,
  type RoleDef,
} from "@/lib/rbac";
import { planAllowsGroup, planByCode } from "@/lib/plans";
import { orgTypeAllowsGroup, orgTypeByCode } from "@/lib/orgTypes";
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

  const plan = planByCode(tenant.planCode);
  const orgType = orgTypeByCode(tenant.orgTypeCode);
  const isPlatform = def.portal === "platform";

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
    if (isBusinessModule && !orgTypeAllowsGroup(tenant.orgTypeCode, group)) return "unavailable";
    if (isBusinessModule && !planAllowsGroup(tenant.planCode, group)) return "plan";
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
