import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, HeartPulse, ShieldCheck, Users } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About MediUnivers — The Team Behind the Platform" },
      {
        name: "description",
        content:
          "MediUnivers builds and operates a multi-tenant healthcare platform. Learn about our mission, how subscriptions work and the teams that support every organization.",
      },
      { property: "og:title", content: "About MediUnivers" },
      {
        property: "og:description",
        content: "Our mission, our product model and how we support subscribed organizations.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  {
    icon: HeartPulse,
    title: "Care comes first",
    body: "Every screen is designed to shorten the distance between a patient and their treatment.",
  },
  {
    icon: ShieldCheck,
    title: "Access by design",
    body: "Data is scoped by portal, plan and role — nobody sees more than their job requires.",
  },
  {
    icon: Building2,
    title: "One product, many tenants",
    body: "We build and run the product; organizations subscribe and configure it for themselves.",
  },
  {
    icon: Users,
    title: "Support that knows healthcare",
    body: "Sales, onboarding and support teams that have worked inside clinics and labs.",
  },
];

const TEAMS = [
  {
    name: "Product & Engineering",
    body: "Owns the platform roadmap, module releases and reliability.",
  },
  {
    name: "Sales & CRM",
    body: "Handles demo requests, qualifies leads and moves organizations onto the right plan.",
  },
  {
    name: "Onboarding",
    body: "Sets up organizations, clinics, branches and the first set of staff roles.",
  },
  {
    name: "Support & Finance",
    body: "Resolves tickets, manages subscriptions, invoices, coupons and referrals.",
  },
];

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title="We build the platform. You run the care."
        subtitle="MediUnivers is the product owner of a multi-tenant healthcare SaaS used by clinics, pharmacies and laboratories."
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Our mission</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Healthcare teams lose hours every day to registers, spreadsheets and disconnected
              software. MediUnivers replaces that with one console where appointments,
              prescriptions, inventory, lab results, billing and the organization's public website
              all share the same data.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Organizations request a demo, choose a plan and get exactly the modules that plan
              unlocks. From there the organization's own administrator creates roles for doctors,
              reception, pharmacists, lab technicians and accountants — so every staff member logs
              in to a workspace built around their job.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <Card key={v.title} className="p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <v.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
              </Card>
            ))}
          </div>
        </div>

        <h2 className="mt-16 text-xl font-semibold tracking-tight text-foreground">
          Teams behind MediUnivers
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAMS.map((t) => (
            <Card key={t.name} className="p-5">
              <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/request-demo">Request a demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact us</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
