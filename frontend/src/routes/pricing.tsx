import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PlanAddonPicker } from "@/components/site/PlanAddonPicker";
import { TestimonialsPreview } from "@/components/site/TestimonialsPreview";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { PlanApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";

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

      {loadError ? (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <Card className="p-4 text-sm text-destructive">{loadError}</Card>
        </section>
      ) : (
        <PlanAddonPicker />
      )}

      <TestimonialsPreview />

      {plans && !loadError ? (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
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
        </section>
      ) : null}
    </SiteLayout>
  );
}
