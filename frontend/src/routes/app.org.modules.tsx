import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, ShieldAlert, XCircle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/org/modules")({
  head: () => ({
    meta: [
      { title: "Configure Modules — MediUnivers Organization" },
      {
        name: "description",
        content: "Which business modules your organization's subscription unlocks, and why.",
      },
    ],
  }),
  component: ModulesPage,
});

interface OrgModuleStatus {
  group: "CLINIC" | "PHARMACY" | "LAB" | "CRM" | "CMS";
  availableByOrgType: boolean;
  availableByPlan: boolean;
  enabled: boolean;
}

const MODULE_META: Record<OrgModuleStatus["group"], { label: string; blurb: string }> = {
  CLINIC: {
    label: "Clinic",
    blurb: "Doctors, patients, appointments, consultations and prescriptions.",
  },
  PHARMACY: { label: "Pharmacy", blurb: "Medicines, stock, purchases, dispensing and sales." },
  LAB: { label: "Laboratory", blurb: "Test catalogue, samples, processing and results." },
  CRM: { label: "Patient CRM", blurb: "Leads, follow-ups and patient acquisition campaigns." },
  CMS: { label: "Website & CMS", blurb: "Your organization's public website and booking page." },
};

function ModulesPage() {
  const { isPlatform } = usePermissions();
  const [modules, setModules] = useState<OrgModuleStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatform) return;
    apiFetch<OrgModuleStatus[]>("/api/org/modules")
      .then(setModules)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load your modules."),
      );
  }, [isPlatform]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Module configuration belongs to a subscribed organization, not the platform console.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configure Modules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A module is enabled only when your organization's business type runs it <em>and</em> your
          subscription plan currently pays for it. Enabled modules are what you can build roles and
          add staff for.
        </p>
      </div>

      {error ? (
        <Card className="p-4 text-sm text-destructive">{error}</Card>
      ) : !modules ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((m) => {
            const meta = MODULE_META[m.group];
            return (
              <Card key={m.group} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{meta.label}</p>
                  {m.enabled ? (
                    <Badge
                      className="gap-1 border-primary/25 bg-primary/10 text-primary"
                      variant="outline"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Enabled
                    </Badge>
                  ) : !m.availableByOrgType ? (
                    <Badge className="gap-1" variant="outline">
                      <XCircle className="h-3 w-3" /> Not your business type
                    </Badge>
                  ) : (
                    <Badge className="gap-1" variant="outline">
                      <Lock className="h-3 w-3" /> Needs plan upgrade
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                {!m.enabled && m.availableByOrgType ? (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="mt-auto h-auto justify-start px-0"
                  >
                    <Link to="/app/org/plans">Upgrade to unlock →</Link>
                  </Button>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
