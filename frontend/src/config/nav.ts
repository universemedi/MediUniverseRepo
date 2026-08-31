import { MODULES } from "./modules";

export interface NavItem {
  label: string;
  to: string;
  path: string;
  icon: string;
  group: string;
}

export interface NavSection {
  label: string;
  icon: string;
  group: string;
  portal: "platform" | "tenant" | "patient";
  items: NavItem[];
}

const ICONS: Record<string, string> = {
  platform: "ShieldCheck",
  org: "Building2",
  billing: "Receipt",
  clinic: "Stethoscope",
  pharmacy: "Pill",
  lab: "FlaskConical",
  crm: "Target",
  cms: "Globe",
  patient: "HeartPulse",
};

const SECTION_LABELS: Record<string, string> = {
  platform: "MediUnivers Control",
  org: "Organization",
  billing: "Billing",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  crm: "Patient CRM",
  cms: "Website & CMS",
  patient: "Patient Portal",
};

const SECTION_PORTAL: Record<string, "platform" | "tenant" | "patient"> = {
  platform: "platform",
  org: "tenant",
  billing: "tenant",
  clinic: "tenant",
  pharmacy: "tenant",
  lab: "tenant",
  crm: "tenant",
  cms: "tenant",
  patient: "patient",
};

const ITEM_ICONS: Record<string, string> = {
  /* platform */
  "platform/organization-types": "Shapes",
  "platform/organizations": "Building2",
  "platform/plans": "Layers",
  "platform/modules": "Blocks",
  "platform/features": "ToggleRight",
  "platform/subscriptions": "CreditCard",
  "platform/trials": "Timer",
  "platform/demo-requests": "CalendarCheck",
  "platform/leads": "Target",
  "platform/coupons": "TicketPercent",
  "platform/referrals": "Share2",
  "platform/support": "LifeBuoy",
  "platform/users": "UserCog",
  "platform/roles": "KeyRound",
  "platform/audit-logs": "ScrollText",
  "platform/cms": "Globe",
  "platform/testimonials": "Quote",
  "platform/blog": "Newspaper",
  "platform/content-cards": "LayoutGrid",
  /* org */
  "org/modules": "Blocks",
  "org/settings": "Settings",
  "org/branches": "MapPin",
  "org/departments": "Network",
  "org/users": "Users",
  "org/roles": "KeyRound",
  "org/subscription": "CreditCard",
  "org/onboarding": "Rocket",
  "org/communication": "MessageSquare",
  "org/notification-templates": "MessageSquareText",
  "org/notifications": "Bell",
  /* billing */
  "billing/invoices": "Receipt",
  /* clinic */
  "clinic/patients": "Users",
  "clinic/appointments": "CalendarDays",
  "clinic/walk-in": "UserPlus",
  "clinic/reception": "ConciergeBell",
  "clinic/queue": "ListOrdered",
  "clinic/consultations": "Stethoscope",
  "clinic/prescriptions": "FileHeart",
  "clinic/doctors": "BriefcaseMedical",
  "clinic/availability": "CalendarClock",
  "clinic/billing": "Receipt",
  "clinic/reports": "ChartNoAxesColumn",
  /* pharmacy */
  "pharmacy/categories": "Shapes",
  "pharmacy/medicines": "Pill",
  "pharmacy/manufacturers": "Factory",
  "pharmacy/suppliers": "Truck",
  "pharmacy/purchases": "ShoppingCart",
  "pharmacy/batches": "PackageSearch",
  "pharmacy/stock": "Boxes",
  "pharmacy/dispensing": "ClipboardPlus",
  "pharmacy/sales": "BadgeIndianRupee",
  "pharmacy/returns": "Undo2",
  "pharmacy/alerts": "TriangleAlert",
  "pharmacy/reports": "ChartNoAxesColumn",
  /* lab */
  "lab/categories": "Shapes",
  "lab/tests": "TestTube",
  "lab/packages": "PackagePlus",
  "lab/orders": "ClipboardList",
  "lab/samples": "TestTubes",
  "lab/processing": "Microscope",
  "lab/results": "FileBarChart",
  "lab/review": "BadgeCheck",
  "lab/reports": "ChartNoAxesColumn",
  /* crm */
  "crm/sources": "Radar",
  "crm/leads": "Target",
  "crm/follow-ups": "PhoneCall",
  "crm/activities": "Activity",
  "crm/reports": "ChartNoAxesColumn",
  /* cms */
  "cms/templates": "LayoutTemplate",
  "cms/branding": "Palette",
  "cms/services": "Sparkles",
  "cms/gallery": "Images",
  "cms/testimonials": "Quote",
  "cms/blogs": "Newspaper",
  "cms/enquiries": "Inbox",
  /* patient */
  "patient/book": "CalendarPlus",
  "patient/appointments": "CalendarDays",
  "patient/prescriptions": "FileHeart",
  "patient/reports": "FileBarChart",
  "patient/invoices": "Receipt",
};

export const NAV_SECTIONS: NavSection[] = Object.keys(SECTION_LABELS).map((group) => ({
  label: SECTION_LABELS[group] as string,
  icon: ICONS[group] as string,
  group,
  portal: SECTION_PORTAL[group] as "platform" | "tenant" | "patient",
  items: MODULES.filter((m) => m.group === group).map((m) => ({
    label: m.title,
    to: `/app/${m.path}`,
    path: m.path,
    icon: ITEM_ICONS[m.path] ?? "Circle",
    group,
  })),
}));

/** module paths that have a dedicated route file instead of the /app/$ catch-all */
const DEDICATED: Record<string, string> = {
  "org/roles": "/app/org/roles",
  "org/communication": "/app/org/communication",
  "org/notification-templates": "/app/org/notification-templates",
  "org/notifications": "/app/org/notifications",
  "patient/book": "/app/patient/book",
};

/** typed <Link> props for a module path */
export function moduleLinkProps(path: string) {
  const dedicated = DEDICATED[path];
  if (dedicated) return { to: dedicated } as const;
  return { to: "/app/$", params: { _splat: path } } as const;
}
