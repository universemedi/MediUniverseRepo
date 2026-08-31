import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Globe,
  Pill,
  ShieldCheck,
  Target,
  Check,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiFetchPublic } from "@/lib/api";
import type { PlanApiDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediUnivers — Healthcare SaaS for Clinics, Pharmacies & Labs" },
      {
        name: "description",
        content:
          "MediUnivers unifies appointments, billing, pharmacy inventory, lab workflows, CRM and a website builder in one role-based healthcare platform.",
      },
      { property: "og:title", content: "MediUnivers — Healthcare SaaS Platform" },
      {
        property: "og:description",
        content:
          "Appointments, pharmacy, laboratory, CRM and CMS in one multi-tenant healthcare console.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Clinic operations",
    body: "Patients, appointments, live queue, consultation and billing in one flow.",
  },
  {
    icon: Pill,
    title: "Pharmacy",
    body: "Medicine master, suppliers, batch stock, expiry alerts and counter sales.",
  },
  {
    icon: FlaskConical,
    title: "Laboratory",
    body: "Test catalogue, sample tracking, result entry and doctor review.",
  },
  {
    icon: Target,
    title: "Patient CRM",
    body: "Lead sources, follow-ups and conversions from enquiry to appointment.",
  },
  {
    icon: Globe,
    title: "Website & CMS",
    body: "Every organization gets a themeable public site with online booking.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Platform, organization and patient portals with custom org roles.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Request a demo",
    body: "Our sales team reviews your enquiry and walks you through the product.",
  },
  {
    step: "02",
    title: "Pick a plan",
    body: "Start on a free trial, then subscribe to Starter, Professional or Enterprise.",
  },
  {
    step: "03",
    title: "Onboard your org",
    body: "Add clinics, branches, departments and invite your team.",
  },
  {
    step: "04",
    title: "Create your roles",
    body: "Doctors, reception, pharmacists and lab staff get exactly the pages they need.",
  },
];

function priceLine(p: PlanApiDto): string {
  if (p.freeTrial) return `Free / ${p.freeTrialDays} days`;
  if (!p.priceWithoutTax) return "Custom";
  return `₹${p.priceWithTax.toLocaleString("en-IN")} / month`;
}

function Landing() {
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
            Multi-tenant healthcare SaaS
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Run clinics, pharmacies and laboratories from a single console
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            MediUnivers brings appointments, queue management, billing, inventory, lab workflows,
            CRM and your public website together — with granular role-based access for every team
            member.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/free-trial">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/request-demo">Request a demo</Link>
            </Button>
          </div>
          <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["480+", "Organizations"],
              ["6", "Core modules"],
              ["14", "Built-in roles"],
              ["99.9%", "Uptime target"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg border border-border bg-card p-4">
                <dt className="text-xl font-semibold text-foreground">{v}</dt>
                <dd className="text-xs text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Everything a healthcare group needs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Modules unlock according to the plan the organization subscribes to.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 transition-shadow hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            How onboarding works
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-lg border border-border bg-background p-5">
                <span className="text-xs font-semibold text-primary">{s.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Plans that grow with you
          </h2>
          <Button asChild variant="outline">
            <Link to="/pricing">See full pricing</Link>
          </Button>
        </div>
        {!plans ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <Card key={p.code} className="flex flex-col p-6">
                <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                <p className="mt-1 text-xl font-semibold text-primary">{priceLine(p)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  {p.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                    </li>
                  ))}
                </ul>
                {p.freeTrial ? (
                  <Button asChild className="mt-5">
                    <Link to="/free-trial">Start free trial</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="mt-5"
                    variant={p.code === "PROFESSIONAL" ? "default" : "outline"}
                  >
                    <Link to="/subscribe" search={{ plan: p.code }}>
                      Subscribe now
                    </Link>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to see MediUnivers in action?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Book a guided demo with our team or start a 14-day free trial today.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/request-demo">Request a demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/free-trial">Start free trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
