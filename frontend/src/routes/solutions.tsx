import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions for Clinics, Hospitals, Pharmacies & Labs | MediUnivers" },
      {
        name: "description",
        content:
          "MediUnivers solutions for single clinics, multi-branch hospital groups, retail pharmacies, diagnostic laboratories and polyclinics.",
      },
      { property: "og:title", content: "MediUnivers Solutions" },
      {
        property: "og:description",
        content: "Tailored healthcare workflows by organization type.",
      },
    ],
  }),
  component: SolutionsPage,
});

const SOLUTIONS = [
  {
    title: "Single clinic",
    plan: "Starter",
    body: "One doctor or a small team running appointments, walk-ins, prescriptions and billing without paperwork.",
    wins: ["Live queue at reception", "Digital prescriptions", "Daily collection report"],
  },
  {
    title: "Multi-branch group",
    plan: "Professional",
    body: "Several clinics under one organization with departments, shared patient records and per-branch reporting.",
    wins: ["Branch switcher", "Department-wise load", "Consolidated revenue"],
  },
  {
    title: "Pharmacy chain",
    plan: "Professional",
    body: "Purchase to sale traceability with batch and expiry control across every counter.",
    wins: ["Batch & expiry alerts", "Supplier ledger", "Prescription dispensing"],
  },
  {
    title: "Diagnostic laboratory",
    plan: "Professional",
    body: "Order intake, sample tracking and verified result delivery back to the referring doctor.",
    wins: ["Sample barcode flow", "Doctor review step", "Downloadable reports"],
  },
  {
    title: "Polyclinic / hospital",
    plan: "Enterprise",
    body: "Clinic, pharmacy and lab operating together, plus a public website and custom staff roles.",
    wins: ["All modules", "Website builder", "Custom role designer"],
  },
  {
    title: "Patients",
    plan: "Included",
    body: "A patient portal for appointments, prescriptions, lab reports and invoices.",
    wins: ["Online booking", "Report history", "Invoice downloads"],
  },
];

function SolutionsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Solutions"
        title="Built for how your organization actually operates"
        subtitle="From a single-doctor clinic to a multi-branch hospital group with its own pharmacy and lab."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s) => (
            <Card key={s.title} className="flex flex-col p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                {s.plan}
              </span>
              <h2 className="mt-1 text-base font-semibold text-foreground">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {s.wins.map((w) => (
                  <li key={w} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {w}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/request-demo">Request a demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
