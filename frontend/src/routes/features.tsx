import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  FlaskConical,
  Globe,
  Pill,
  ShieldCheck,
  Target,
  Building2,
  Users,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Clinic, Pharmacy, Lab, CRM & CMS | MediUnivers" },
      {
        name: "description",
        content:
          "Explore MediUnivers modules: appointments and queue, pharmacy inventory, laboratory workflows, patient CRM, website builder and role-based access control.",
      },
      { property: "og:title", content: "MediUnivers Features" },
      {
        property: "og:description",
        content: "Every module of the MediUnivers healthcare platform in detail.",
      },
    ],
  }),
  component: FeaturesPage,
});

const GROUPS = [
  {
    icon: CalendarDays,
    title: "Clinic management",
    items: [
      "Patient registration & records",
      "Appointments and walk-ins",
      "Reception & live queue",
      "Consultation and prescriptions",
      "Doctor availability",
      "Billing and invoices",
    ],
  },
  {
    icon: Pill,
    title: "Pharmacy",
    items: [
      "Medicine categories & master",
      "Manufacturers and suppliers",
      "Purchases and batch/expiry",
      "Stock levels & low-stock alerts",
      "Prescription dispensing",
      "Direct sales and returns",
    ],
  },
  {
    icon: FlaskConical,
    title: "Laboratory",
    items: [
      "Test categories & catalogue",
      "Test packages",
      "Orders and sample tracking",
      "Processing status",
      "Result entry",
      "Doctor review and reports",
    ],
  },
  {
    icon: Target,
    title: "Patient CRM",
    items: [
      "Lead sources",
      "Lead pipeline and status",
      "Assignment to agents",
      "Follow-ups and activities",
      "Conversion reports",
    ],
  },
  {
    icon: Globe,
    title: "Website & CMS",
    items: [
      "Templates and branding",
      "Pages, services, gallery",
      "Testimonials and blogs",
      "Online booking",
      "SEO settings and subdomain",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Access control",
    items: [
      "Platform, organization and patient portals",
      "14 built-in roles",
      "Custom roles created by the org admin",
      "Page and action level permissions",
      "Plan-based module entitlement",
    ],
  },
  {
    icon: Building2,
    title: "Organization setup",
    items: [
      "Clinics and branches",
      "Departments",
      "Users and invitations",
      "Subscription and billing",
      "Guided onboarding wizard",
    ],
  },
  {
    icon: Users,
    title: "Patient portal",
    items: ["Profile and history", "Appointments", "Prescriptions", "Lab reports", "Invoices"],
  },
];

function FeaturesPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Features"
        title="One platform, every healthcare workflow"
        subtitle="Modules are switched on by subscription plan, so each organization only sees what it pays for."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <Card key={g.title} className="p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <g.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">{g.title}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {g.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {i}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
