/**
 * MediUnivers access model
 * ------------------------------------------------------------------
 * Two completely separate worlds:
 *
 * 1. PLATFORM portal  -> MediUnivers staff (we own the product).
 *    Super Admin, Sales/CRM team lead + agents, Support, Finance.
 *    They manage organizations, plans, modules, demo requests,
 *    subscriptions, coupons, the marketing website and platform users.
 *    They NEVER see a tenant's clinical data.
 *
 * 2. TENANT portal    -> a subscribed organization (our customer).
 *    Org Owner / Org Admin get the modules their PLAN entitles them to,
 *    and they create their own staff roles (doctor, receptionist,
 *    pharmacist, lab tech ...) from that entitlement.
 *
 * 3. PATIENT portal   -> end patients of a tenant.
 */

export type Portal = "platform" | "tenant" | "patient";

export type ModuleGroup =
  "platform" | "org" | "billing" | "clinic" | "pharmacy" | "lab" | "crm" | "cms" | "patient";

export type Action = "view" | "create" | "update" | "delete" | "export" | "approve";

/** "*" = every page in the group, otherwise the exact module paths allowed */
export type GroupAccess = Record<string, "*" | string[]>;

export interface RoleDef {
  key: string;
  name: string;
  portal: Portal;
  description: string;
  /** system roles ship with the product and cannot be edited by an org */
  system: true;
  access: GroupAccess;
  actions: Action[];
}

export const PORTAL_LABEL: Record<Portal, string> = {
  platform: "MediUnivers (Product Owner)",
  tenant: "Organization Workspace",
  patient: "Patient Portal",
};

/* ---------------------------------------------------------------- */
/* Platform roles — MediUnivers internal staff                       */
/* ---------------------------------------------------------------- */

const PLATFORM_ROLES: RoleDef[] = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    portal: "platform",
    description: "Full control of the MediUnivers product, tenants, plans and billing.",
    system: true,
    access: { platform: "*", cms: "*" },
    actions: ["view", "create", "update", "delete", "export", "approve"],
  },
  {
    key: "PLATFORM_SALES_LEAD",
    name: "Sales / CRM Team Lead",
    portal: "platform",
    description: "Owns the demo → trial → subscription pipeline and the sales team.",
    system: true,
    access: {
      platform: [
        "platform/organizations",
        "platform/demo-requests",
        "platform/leads",
        "platform/trials",
        "platform/subscriptions",
        "platform/plans",
        "platform/coupons",
        "platform/referrals",
      ],
    },
    actions: ["view", "create", "update", "export", "approve"],
  },
  {
    key: "PLATFORM_SALES_AGENT",
    name: "Sales Executive",
    portal: "platform",
    description: "Works assigned demo requests and leads, schedules product demos.",
    system: true,
    access: {
      platform: [
        "platform/demo-requests",
        "platform/leads",
        "platform/trials",
        "platform/organizations",
      ],
    },
    actions: ["view", "create", "update"],
  },
  {
    key: "PLATFORM_SUPPORT",
    name: "Support Agent",
    portal: "platform",
    description: "Handles tenant support tickets and onboarding assistance.",
    system: true,
    access: { platform: ["platform/support", "platform/organizations", "platform/audit-logs"] },
    actions: ["view", "update"],
  },
  {
    key: "PLATFORM_FINANCE",
    name: "Finance / Billing",
    portal: "platform",
    description: "Subscriptions, invoices, coupons and revenue reporting.",
    system: true,
    access: {
      platform: [
        "platform/subscriptions",
        "platform/plans",
        "platform/coupons",
        "platform/organizations",
      ],
    },
    actions: ["view", "update", "export"],
  },
  {
    key: "PLATFORM_MARKETING",
    name: "Marketing / Website",
    portal: "platform",
    description: "MediUnivers marketing website content and SEO.",
    system: true,
    access: { platform: ["platform/cms"], cms: "*" },
    actions: ["view", "create", "update", "delete"],
  },
];

/* ---------------------------------------------------------------- */
/* Tenant roles — created for a subscribed organization              */
/* ---------------------------------------------------------------- */

const TENANT_ROLES: RoleDef[] = [
  {
    key: "ORG_OWNER",
    name: "Organization Owner",
    portal: "tenant",
    description: "Buys the subscription, owns the organization, creates all other roles.",
    system: true,
    access: { org: "*", clinic: "*", pharmacy: "*", lab: "*", crm: "*", cms: "*" },
    actions: ["view", "create", "update", "delete", "export", "approve"],
  },
  {
    key: "ORG_ADMIN",
    name: "Organization Admin",
    portal: "tenant",
    description: "Runs day to day configuration, users, branches and roles.",
    system: true,
    access: { org: "*", clinic: "*", pharmacy: "*", lab: "*", crm: "*", cms: "*" },
    actions: ["view", "create", "update", "export"],
  },
  {
    key: "CLINIC_ADMIN",
    name: "Clinic Admin",
    portal: "tenant",
    description: "Manages one clinic/branch: staff, schedules, billing.",
    system: true,
    access: { org: ["org/branches", "org/departments", "org/users"], clinic: "*" },
    actions: ["view", "create", "update", "delete", "export"],
  },
  {
    key: "DOCTOR",
    name: "Doctor",
    portal: "tenant",
    description: "Consultations, prescriptions, lab review and own availability.",
    system: true,
    access: {
      clinic: [
        "clinic/patients",
        "clinic/appointments",
        "clinic/queue",
        "clinic/consultations",
        "clinic/prescriptions",
        "clinic/availability",
      ],
      lab: ["lab/orders", "lab/results", "lab/review"],
    },
    actions: ["view", "create", "update", "approve"],
  },
  {
    key: "RECEPTIONIST",
    name: "Receptionist",
    portal: "tenant",
    description: "Front desk: registration, appointments, queue and payments.",
    system: true,
    access: {
      clinic: [
        "clinic/patients",
        "clinic/appointments",
        "clinic/walk-in",
        "clinic/reception",
        "clinic/queue",
        "clinic/billing",
      ],
    },
    actions: ["view", "create", "update"],
  },
  {
    key: "NURSE",
    name: "Nurse",
    portal: "tenant",
    description: "Vitals, queue support and consultation assistance.",
    system: true,
    access: {
      clinic: ["clinic/patients", "clinic/queue", "clinic/consultations", "clinic/appointments"],
    },
    actions: ["view", "update"],
  },
  {
    key: "PHARMACIST",
    name: "Pharmacist",
    portal: "tenant",
    description: "Dispensing, sales, stock and purchase management.",
    system: true,
    access: { pharmacy: "*" },
    actions: ["view", "create", "update", "export"],
  },
  {
    key: "LAB_MANAGER",
    name: "Lab Manager",
    portal: "tenant",
    description: "Full laboratory operations, catalogue and reporting.",
    system: true,
    access: { lab: "*" },
    actions: ["view", "create", "update", "delete", "export", "approve"],
  },
  {
    key: "LAB_TECHNICIAN",
    name: "Lab Technician",
    portal: "tenant",
    description: "Sample collection, processing and result entry.",
    system: true,
    access: { lab: ["lab/orders", "lab/samples", "lab/processing", "lab/results"] },
    actions: ["view", "update"],
  },
  {
    key: "ACCOUNTANT",
    name: "Accountant",
    portal: "tenant",
    description: "Billing, pharmacy sales and financial reports.",
    system: true,
    access: {
      clinic: ["clinic/billing", "clinic/reports"],
      pharmacy: ["pharmacy/sales", "pharmacy/reports"],
      org: ["org/subscription"],
    },
    actions: ["view", "export"],
  },
  {
    key: "CRM_AGENT",
    name: "CRM Agent",
    portal: "tenant",
    description: "Patient acquisition leads, follow-ups and campaigns.",
    system: true,
    access: { crm: "*" },
    actions: ["view", "create", "update"],
  },
  {
    key: "MARKETING_MANAGER",
    name: "Website Manager",
    portal: "tenant",
    description: "The organization's public website, booking page and SEO.",
    system: true,
    access: { cms: "*", crm: ["crm/leads"] },
    actions: ["view", "create", "update", "delete"],
  },
];

const PATIENT_ROLES: RoleDef[] = [
  {
    key: "PATIENT",
    name: "Patient",
    portal: "patient",
    description: "Books appointments and views prescriptions, reports and invoices.",
    system: true,
    access: { patient: "*" },
    actions: ["view"],
  },
];

export const ROLES: RoleDef[] = [...PLATFORM_ROLES, ...TENANT_ROLES, ...PATIENT_ROLES];

export type RoleKey = string;

export const roleByKey = (key: RoleKey, extra: RoleDef[] = []): RoleDef =>
  [...ROLES, ...extra].find((r) => r.key === key) ?? (ROLES[0] as RoleDef);

export const rolesForPortal = (portal: Portal) => ROLES.filter((r) => r.portal === portal);

/** groups an org admin is allowed to hand out when building a custom role */
export const TENANT_GROUPS: ModuleGroup[] = ["org", "clinic", "pharmacy", "lab", "crm", "cms"];

export function roleAllowsPath(role: RoleDef, group: string, path: string) {
  const entry = role.access[group];
  if (!entry) return false;
  return entry === "*" || entry.includes(path);
}

export function roleAllowsGroup(role: RoleDef, group: string) {
  return Boolean(role.access[group]);
}

export function roleCan(role: RoleDef, action: Action) {
  return role.actions.includes(action);
}
