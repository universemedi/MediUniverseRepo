import type { ModuleGroup } from "./rbac";

export interface PlanDef {
  code: "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  name: string;
  price: string;
  tagline: string;
  /** module groups unlocked by this plan (org + patient are always included) */
  modules: ModuleGroup[];
  limits: { branches: number; users: number; storage: string };
  highlights: string[];
}

const BASE: ModuleGroup[] = ["org", "patient"];

export const PLANS: PlanDef[] = [
  {
    code: "TRIAL",
    name: "Free Trial",
    price: "₹0 / 14 days",
    tagline: "Demo requested and approved by the MediUnivers sales team.",
    modules: [...BASE, "clinic"],
    limits: { branches: 1, users: 5, storage: "1 GB" },
    highlights: ["Clinic module", "1 branch", "5 users"],
  },
  {
    code: "STARTER",
    name: "Starter",
    price: "₹2,999 / month",
    tagline: "Single clinic running appointments, queue and billing.",
    modules: [...BASE, "clinic"],
    limits: { branches: 2, users: 15, storage: "10 GB" },
    highlights: ["Clinic module", "2 branches", "15 users"],
  },
  {
    code: "PROFESSIONAL",
    name: "Professional",
    price: "₹7,999 / month",
    tagline: "Multi-branch clinic with pharmacy, laboratory and patient CRM.",
    modules: [...BASE, "clinic", "pharmacy", "lab", "crm"],
    limits: { branches: 10, users: 75, storage: "100 GB" },
    highlights: ["Clinic + Pharmacy + Lab", "Patient CRM", "10 branches"],
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    tagline: "Everything, including the website builder and custom roles.",
    modules: [...BASE, "clinic", "pharmacy", "lab", "crm", "cms"],
    limits: { branches: 999, users: 999, storage: "1 TB" },
    highlights: ["All modules", "Website builder", "Unlimited branches"],
  },
];

export const planByCode = (code: string): PlanDef =>
  PLANS.find((p) => p.code === code) ?? (PLANS[2] as PlanDef);

export const planAllowsGroup = (code: string, group: string) =>
  group === "platform" ? false : planByCode(code).modules.includes(group as ModuleGroup);
