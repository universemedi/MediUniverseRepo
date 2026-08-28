import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PLANS } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  { key: "org", label: "Organization & users" },
  { key: "clinic", label: "Clinic management" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "lab", label: "Laboratory" },
  { key: "crm", label: "Patient CRM" },
  { key: "cms", label: "Website & CMS" },
  { key: "patient", label: "Patient portal" },
];

function PricingPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Pricing"
        title="Pay for the modules your organization uses"
        subtitle="Start with a 14-day free trial after a demo. Upgrade any time — new modules appear instantly in the console."
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Card key={p.code} className="flex flex-col p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
                {p.code === "PROFESSIONAL" ? (
                  <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-semibold text-primary">{p.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p.limits.storage}{" "}
                  storage
                </li>
              </ul>
              <Button
                asChild
                className="mt-5"
                variant={p.code === "PROFESSIONAL" ? "default" : "outline"}
              >
                <Link to={p.code === "TRIAL" ? "/free-trial" : "/request-demo"}>
                  {p.code === "TRIAL" ? "Start free trial" : "Talk to sales"}
                </Link>
              </Button>
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
                {PLANS.map((p) => (
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
                  {PLANS.map((p) => (
                    <td key={p.code} className="px-4 py-3">
                      {p.modules.includes(row.key as never) ? (
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
                {PLANS.map((p) => (
                  <td key={p.code} className="px-4 py-3 text-muted-foreground">
                    {p.limits.branches}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 text-foreground">Users</td>
                {PLANS.map((p) => (
                  <td key={p.code} className="px-4 py-3 text-muted-foreground">
                    {p.limits.users}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </SiteLayout>
  );
}
