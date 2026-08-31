import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, ShieldAlert } from "lucide-react";
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

export const Route = createFileRoute("/app/platform/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — MediUnivers Platform" },
      {
        name: "description",
        content: "Active, pending and cancelled subscriptions across tenants.",
      },
    ],
  }),
  component: SubscriptionsPage,
});

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "border-amber-300 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  EXPIRED: "border-destructive/25 bg-destructive/10 text-destructive",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  SUPERSEDED: "text-muted-foreground",
};

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function SubscriptionsPage() {
  const { isPlatform } = usePermissions();
  const [rows, setRows] = useState<SubscriptionApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SubscriptionApiDto[]>("/api/platform/subscriptions")
      .then(setRows)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load subscriptions."),
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
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every subscription period across tenants — created by the signup, payment and renewal
          flows.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !rows ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <CreditCard className="mx-auto mb-2 h-6 w-6" />
          No subscriptions yet.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.organizationName}</TableCell>
                  <TableCell>
                    {r.planName}{" "}
                    {r.freeTrial ? (
                      <span className="text-xs text-muted-foreground">(trial)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{r.startDate}</TableCell>
                  <TableCell>{r.endDate ?? "—"}</TableCell>
                  <TableCell>{r.freeTrial ? "Free" : currency(r.priceWithTax)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
