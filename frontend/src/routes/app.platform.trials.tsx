import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, Timer } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { SubscriptionApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const remaining = daysRemaining(r.endDate);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.organizationName}</TableCell>
                    <TableCell>{r.planName}</TableCell>
                    <TableCell>{r.startDate}</TableCell>
                    <TableCell>{r.endDate ?? "—"}</TableCell>
                    <TableCell>
                      {remaining === null ? (
                        "—"
                      ) : (
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
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
