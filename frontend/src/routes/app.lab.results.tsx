import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertOctagon, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

interface ResultsSearch {
  orderId?: number | undefined;
}

export const Route = createFileRoute("/app/lab/results")({
  validateSearch: (search: Record<string, unknown>): ResultsSearch => ({
    orderId: typeof search["orderId"] === "number" ? (search["orderId"] as number) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Result Entry — MediUnivers Laboratory" },
      {
        name: "description",
        content: "Enter and verify lab results, with automatic Low/Normal/High/Critical flagging.",
      },
    ],
  }),
  component: ResultsPage,
});

interface OrderItem {
  id: number;
  testId: number;
  testName: string;
  sampleType: string;
  price: number;
  result: {
    id: number;
    resultValue: string;
    unit: string | null;
    flag: string;
    status: string;
  } | null;
}
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  patient: { name: string; patientNumber: string };
  items: OrderItem[];
}

const FLAG_STYLE: Record<string, string> = {
  LOW: "border-blue-300 bg-blue-50 text-blue-700",
  NORMAL: "border-emerald-300 bg-emerald-50 text-emerald-700",
  HIGH: "border-amber-300 bg-amber-50 text-amber-700",
  CRITICAL: "border-destructive/25 bg-destructive/10 text-destructive",
  UNKNOWN: "text-muted-foreground",
};

function ResultsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const { orderId } = Route.useSearch();
  const unavailable = !isPlatform && isUnavailable("lab");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<
    Record<number, { value: string; unit: string; remarks: string }>
  >({});
  const [selectedForVerify, setSelectedForVerify] = useState<number[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    apiFetch<Order[]>("/api/lab/orders?status=COLLECTED,PROCESSING,RESULT_READY")
      .then((list) => {
        setOrders(list);
        if (orderId) {
          const found = list.find((o) => o.id === orderId);
          if (found) setActive(found);
        }
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load orders."),
      );
  }
  useEffect(load, [isPlatform, unavailable, orderId]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }
  if (unavailable) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Laboratory isn't part of this organization</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  async function saveResult(item: OrderItem) {
    if (!active) return;
    const v = values[item.id];
    if (!v?.value.trim()) return;
    setSaving(item.id);
    try {
      await apiFetch(`/api/lab/orders/${active.id}/results`, {
        method: "POST",
        data: {
          orderItemId: item.id,
          resultValue: v.value.trim(),
          unit: v.unit || null,
          remarks: v.remarks || null,
        },
      });
      toast.success(`${item.testName} result saved`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save this result.");
    } finally {
      setSaving(null);
    }
  }

  async function verifySelected() {
    if (!active || !selectedForVerify.length) return;
    setVerifying(true);
    try {
      await apiFetch(`/api/lab/orders/${active.id}/results/verify`, {
        method: "POST",
        data: { orderItemIds: selectedForVerify },
      });
      toast.success("Results verified", { description: "The report is now available." });
      setSelectedForVerify([]);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't verify these results.");
    } finally {
      setVerifying(false);
    }
  }

  if (active) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{active.orderNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {active.patient.name} · {active.patient.patientNumber}
            </p>
          </div>
          <Button variant="outline" onClick={() => setActive(null)}>
            Back to orders
          </Button>
        </div>

        <Card className="divide-y divide-border">
          {active.items.map((item) => {
            const enteredNotVerified = item.result && item.result.status === "ENTERED";
            const verified = item.result && item.result.status === "VERIFIED";
            return (
              <div key={item.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.testName}</p>
                  <span className="text-xs text-muted-foreground">({item.sampleType})</span>
                  {item.result ? (
                    <Badge variant="outline" className={FLAG_STYLE[item.result.flag] ?? ""}>
                      {item.result.flag}
                    </Badge>
                  ) : null}
                  {verified ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  ) : null}
                  {item.result?.flag === "CRITICAL" ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-destructive/25 bg-destructive/10 text-destructive"
                    >
                      <AlertOctagon className="h-3 w-3" /> Critical
                    </Badge>
                  ) : null}
                </div>
                {verified ? (
                  <p className="text-sm">
                    {item.result?.resultValue} {item.result?.unit ?? ""}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Result value"
                      className="w-40"
                      defaultValue={item.result?.resultValue ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [item.id]: {
                            ...v[item.id],
                            value: e.target.value,
                            unit: v[item.id]?.unit ?? item.result?.unit ?? "",
                            remarks: v[item.id]?.remarks ?? "",
                          },
                        }))
                      }
                    />
                    <Input
                      placeholder="Unit"
                      className="w-24"
                      defaultValue={item.result?.unit ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [item.id]: {
                            ...v[item.id],
                            unit: e.target.value,
                            value: v[item.id]?.value ?? item.result?.resultValue ?? "",
                            remarks: v[item.id]?.remarks ?? "",
                          },
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={saving === item.id}
                      onClick={() => saveResult(item)}
                    >
                      {saving === item.id ? "Saving…" : item.result ? "Update" : "Save"}
                    </Button>
                    {enteredNotVerified ? (
                      <label className="ml-auto flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={selectedForVerify.includes(item.id)}
                          onCheckedChange={(v) =>
                            setSelectedForVerify((prev) =>
                              v ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                            )
                          }
                        />
                        Select to verify
                      </label>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {selectedForVerify.length ? (
          <div className="flex justify-end">
            <Button onClick={verifySelected} disabled={verifying}>
              {verifying ? "Verifying…" : `Verify ${selectedForVerify.length} result(s)`}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Result Entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders with a collected sample, waiting on results or verification.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !orders ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No orders waiting on results right now.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {o.orderNumber} · {o.patient.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{o.items.length} test(s)</p>
              </div>
              <Badge variant="outline">{o.status.replace("_", " ")}</Badge>
              <Button size="sm" onClick={() => setActive(o)}>
                Open
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
