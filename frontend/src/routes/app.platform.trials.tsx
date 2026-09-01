import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Timer } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import type { SubscriptionApiDto } from "@/lib/types";
import { DataTable } from "@/components/common/DataTable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/platform/trials")({
  head: () => ({
    meta: [
      { title: "Free Trials — MediUnivers Platform" },
      { name: "description", content: "Trial accounts, expiry tracking and conversion." },
    ],
  }),
  component: TrialsPage,
});

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function daysLeftLabel(endDate: string | null): string {
  const remaining = daysRemaining(endDate);
  if (remaining === null) return "";
  return remaining <= 0 ? "Expiring today" : `${remaining} days`;
}

function toRow(s: SubscriptionApiDto): Row {
  return {
    id: String(s.id),
    organization: s.organizationName,
    plan: s.planName,
    startDate: s.startDate,
    endDate: s.endDate ?? "",
    daysLeft: daysLeftLabel(s.endDate),
  };
}

function TrialsPage() {
  const { isPlatform } = usePermissions();
  const [rows, setRows] = useState<SubscriptionApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions/trials")
      .then(setRows)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load trials."),
      );
  }, []);

  const columns = useMemo(
    () => [
      col("organization", "Organization", "org", { required: true }),
      col("plan", "Plan", "badge", { secondary: true }),
      col("startDate", "Started", "date"),
      col("endDate", "Expires", "date"),
      col("daysLeft", "Days left", "badge", {
        render: (r) => {
          const remaining = daysRemaining(String(r["endDate"]) || null);
          if (remaining === null) return "—";
          return (
            <Badge
              variant="outline"
              className={
                remaining <= 3
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
              }
            >
              {remaining <= 0 ? "Expiring today" : `${remaining} days`}
            </Badge>
          );
        },
      }),
    ],
    [],
  );

  if (!isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Platform area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Free Trials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizations currently on an active free trial. Trials expire automatically on their end
          date.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !rows ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Timer className="mx-auto mb-2 h-6 w-6" />
          No active trials right now.
        </Card>
      ) : (
        <DataTable
          id="platform/trials"
          title="Free Trials"
          rows={rows.map(toRow)}
          columns={columns}
          canExport
        />
      )}
    </div>
  );
}
