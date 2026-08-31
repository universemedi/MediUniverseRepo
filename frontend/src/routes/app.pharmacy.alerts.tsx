import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, PackageX, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/pharmacy/alerts")({
  head: () => ({ meta: [{ title: "Pharmacy Alerts — MediUnivers" }] }),
  component: AlertsPage,
});

interface LowStockAlert {
  medicineId: number;
  medicineName: string;
  branchName: string;
  reorderLevel: number;
  currentStock: number;
}

interface ExpiringBatch {
  batchId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantityAvailable: number;
}

function AlertsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("pharmacy");
  const [lowStock, setLowStock] = useState<LowStockAlert[] | null>(null);
  const [expiring, setExpiring] = useState<ExpiringBatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatform || unavailable) return;
    apiFetch<LowStockAlert[]>("/api/pharmacy/alerts/low-stock")
      .then(setLowStock)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load alerts."));
    apiFetch<ExpiringBatch[]>("/api/pharmacy/stock/expiring", { params: { withinDays: 30 } })
      .then(setExpiring)
      .catch(() => setExpiring([]));
  }, [isPlatform, unavailable]);

  if (isPlatform || unavailable) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">
          {isPlatform ? "Organization area" : "Pharmacy isn't part of this organization"}
        </h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  const loading = !lowStock || !expiring;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live low-stock and expiry alerts, computed from your current batches — refresh to
          re-check.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <PackageX className="h-4 w-4 text-destructive" /> Low stock
          </h2>
          {loading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : lowStock!.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No low-stock medicines right now.
            </Card>
          ) : (
            <div className="space-y-2">
              {lowStock!.map((a) => (
                <Card
                  key={`${a.medicineId}-${a.branchName}`}
                  className="flex items-center justify-between p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.medicineName}</p>
                    <p className="text-xs text-muted-foreground">{a.branchName}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-destructive/25 bg-destructive/10 text-destructive"
                  >
                    {a.currentStock} / {a.reorderLevel}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Expiring within 30 days
          </h2>
          {loading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : expiring!.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nothing expiring soon.
            </Card>
          ) : (
            <div className="space-y-2">
              {expiring!.map((b) => (
                <Card key={b.batchId} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.medicineName}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch {b.batchNumber} · {b.quantityAvailable} units
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    {b.expiryDate}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
