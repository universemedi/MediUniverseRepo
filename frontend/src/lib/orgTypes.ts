import type { ModuleGroup } from "./rbac";

/**
 * Organization Type answers "what kind of business is this?" — it is set once
 * during onboarding (or by MediUnivers staff) and defines which module groups
 * even apply to the organization, independent of what the subscription plan
 * unlocks.
 *
 *   Organization Type -> which business modules exist for this org at all
 *   Subscription Plan -> which of those modules are currently paid for
 *   Role               -> which pages within the unlocked modules this user can open
 *
 * A clinic that never runs a pharmacy or lab should never see Pharmacy/Lab
 * anywhere in its console, no matter how high its plan is. A standalone
 * pharmacy should never see Clinic pages. This is what makes the sidebar
 * different for a "Clinic only" customer vs a "Clinic + Pharmacy + Lab" one.
 */

export type OrgTypeCode =
  "CLINIC_ONLY" | "CLINIC_PHARMACY" | "MULTI_SPECIALITY" | "STANDALONE_PHARMACY" | "STANDALONE_LAB";

export interface OrgTypeDef {
  code: OrgTypeCode;
  name: string;
  description: string;
  /** business module groups this org type can ever use (org + patient always included) */
  modules: ModuleGroup[];
}

const BASE: ModuleGroup[] = ["org", "patient"];

export const ORG_TYPES: OrgTypeDef[] = [
  {
    code: "CLINIC_ONLY",
    name: "Clinic",
    description: "A single or multi-branch clinic. No in-house pharmacy or laboratory.",
    modules: [...BASE, "clinic", "crm", "cms"],
  },
  {
    code: "CLINIC_PHARMACY",
    name: "Clinic + Pharmacy",
    description: "Clinic with an attached, clinic-owned pharmacy. No laboratory.",
    modules: [...BASE, "clinic", "pharmacy", "crm", "cms"],
  },
  {
    code: "MULTI_SPECIALITY",
    name: "Multi-Speciality (Clinic + Pharmacy + Lab)",
    description: "Full-service organization running clinic, pharmacy and laboratory together.",
    modules: [...BASE, "clinic", "pharmacy", "lab", "crm", "cms"],
  },
  {
    code: "STANDALONE_PHARMACY",
    name: "Standalone Pharmacy",
    description: "Pharmacy-only business with no clinic or laboratory operations.",
    modules: [...BASE, "pharmacy", "crm", "cms"],
  },
  {
    code: "STANDALONE_LAB",
    name: "Standalone Laboratory",
    description: "Diagnostic laboratory only — no clinic or pharmacy operations.",
    modules: [...BASE, "lab", "crm", "cms"],
  },
];

export const orgTypeByCode = (code: string): OrgTypeDef =>
  ORG_TYPES.find((t) => t.code === code) ?? (ORG_TYPES[2] as OrgTypeDef);

/** Is this module group even part of what the organization's business does? */
export const orgTypeAllowsGroup = (code: string, group: string) =>
  group === "platform" ? false : orgTypeByCode(code).modules.includes(group as ModuleGroup);
