import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { PlanApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Trial, Starter, Professional & Enterprise | MediUnivers" },
      {
        name: "description",
        content:
          "Transparent MediUnivers pricing. Compare Free Trial, Starter, Professional and Enterprise plans by modules, branches, users and storage.",
      },
      { property: "og:title", content: "MediUnivers Pricing" },
      {
        property: "og:description",
        content: "Plans and module entitlements for healthcare organizations.",
      },
    ],
  }),
  component: PricingPage,
});

const MODULE_ROWS: { key: string; label: string }[] = [
  { key: "ORG", label: "Organization & users" },
  { key: "CLINIC", label: "Clinic management" },
  { key: "PHARMACY", label: "Pharmacy" },
  { key: "LAB", label: "Laboratory" },
  { key: "CRM", label: "Patient CRM" },
  { key: "CMS", label: "Website & CMS" },
  { key: "PATIENT", label: "Patient portal" },
];

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function priceLine(p: PlanApiDto): string {
  if (p.freeTrial) return `Free / ${p.freeTrialDays} days`;
  if (!p.priceWithoutTax) return "Custom";
  return `${currency(p.priceWithTax)} / month`;
}

function PricingPage() {
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then(setPlans)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load plans."));
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Pricing"
        title="Pay for the modules your organization uses"
        subtitle="Start with a 14-day free trial, or subscribe right away — new modules appear instantly in the console."
        bannerKey="pricing"
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        {loadError ? (
          <Card className="p-4 text-sm text-destructive">{loadError}</Card>
        ) : !plans ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <Card key={p.code} className="flex flex-col p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
                    {p.code === "PROFESSIONAL" ? (
                      <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-primary">{priceLine(p)}</p>
                  {!p.freeTrial && p.priceWithoutTax > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {currency(p.priceWithoutTax)} + {p.taxPercent}% tax
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                      </li>
                    ))}
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p.storageLabel}{" "}
                      storage
                    </li>
                  </ul>
                  <div className="mt-5 flex flex-col gap-2">
                    {p.freeTrial ? (
                      <Button asChild variant={p.code === "PROFESSIONAL" ? "default" : "outline"}>
                        <Link to="/free-trial">Start free trial</Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild variant={p.code === "PROFESSIONAL" ? "default" : "outline"}>
                          <Link to="/subscribe" search={{ plan: p.code }}>
                            Subscribe now
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/request-demo">Talk to sales instead</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <h2 className="mt-16 text-xl font-semibold tracking-tight text-foreground">
              Module comparison
            </h2>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Module</th>
                    {plans.map((p) => (
                      <th key={p.code} className="px-4 py-3 font-medium text-muted-foreground">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULE_ROWS.map((row) => (
                    <tr key={row.key} className="border-t border-border">
                      <td className="px-4 py-3 text-foreground">{row.label}</td>
                      {plans.map((p) => (
                        <td key={p.code} className="px-4 py-3">
                          {p.modules.includes(row.key) ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">Branches</td>
                    {plans.map((p) => (
                      <td key={p.code} className="px-4 py-3 text-muted-foreground">
                        {p.maxBranches}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">Users</td>
                    {plans.map((p) => (
                      <td key={p.code} className="px-4 py-3 text-muted-foreground">
                        {p.maxUsers}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">Doctors / branch</td>
                    {plans.map((p) => (
                      <td key={p.code} className="px-4 py-3 text-muted-foreground">
                        {p.maxDoctorsPerBranch}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
