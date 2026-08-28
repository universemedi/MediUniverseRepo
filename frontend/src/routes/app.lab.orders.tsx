import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Lock, Plus, ShieldAlert, TestTubes } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/lab/orders")({
  head: () => ({
    meta: [
      { title: "Lab Orders — MediUnivers Laboratory" },
      {
        name: "description",
        content: "Book lab orders and track them from sample collection through to verification.",
      },
    ],
  }),
  component: OrdersPage,
});

interface Patient {
  id: number;
  firstName: string;
  lastName: string | null;
  patientNumber: string;
}
interface LabTest {
  id: number;
  name: string;
  sampleType: string;
  price: number;
}
interface OrderItem {
  id: number;
  testId: number;
  testName: string;
  sampleType: string;
  price: number;
  result: { flag: string; status: string } | null;
}
interface Order {
  id: number;
  orderNumber: string;
  status: string;
  patient: { id: number; name: string; patientNumber: string };
  doctorName: string | null;
  items: OrderItem[];
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  SAMPLE_PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  COLLECTED: "border-primary/25 bg-primary/10 text-primary",
  PROCESSING: "border-primary/25 bg-primary/10 text-primary",
  RESULT_READY: "border-blue-300 bg-blue-50 text-blue-700",
  VERIFIED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  REJECTED: "border-destructive/25 bg-destructive/10 text-destructive",
};

function OrdersPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("lab");

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [collectFor, setCollectFor] = useState<Order | null>(null);
  const [sampleTypes, setSampleTypes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [collecting, setCollecting] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<Order[]>("/api/lab/orders"),
      apiFetch<Patient[]>("/api/clinic/patients"),
      apiFetch<LabTest[]>("/api/lab/tests"),
    ])
      .then(([o, p, t]) => {
        setOrders(o);
        setPatients(p);
        setTests(t);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load lab orders."),
      );
  }
  useEffect(load, [isPlatform, unavailable]);

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

  async function submitOrder() {
    if (!patientId || !selectedTests.length)
      return setError("Select a patient and at least one test.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/lab/orders", {
        method: "POST",
        data: { patientId: Number(patientId), testIds: selectedTests },
      });
      toast.success("Lab order created");
      setOpen(false);
      setPatientId("");
      setSelectedTests([]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCollection() {
    if (!collectFor) return;
    if (!sampleTypes.trim()) return;
    setCollecting(true);
    try {
      await apiFetch(`/api/lab/orders/${collectFor.id}/collect-sample`, {
        method: "POST",
        data: { sampleTypes: sampleTypes.trim(), remarks: remarks.trim() || null },
      });
      toast.success("Sample collected");
      setCollectFor(null);
      setSampleTypes("");
      setRemarks("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't record the sample collection.");
    } finally {
      setCollecting(false);
    }
  }

  async function startProcessing(order: Order) {
    try {
      await apiFetch(`/api/lab/orders/${order.id}/start-processing`, { method: "POST" });
      toast.success("Marked as processing");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this order.");
    }
  }

  const selectedTestsTotal = tests
    .filter((t) => selectedTests.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sample Pending → Collected → Processing → Result Ready → Verified.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !orders ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-6 w-6" /> No lab orders yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TestTubes className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {o.orderNumber} · {o.patient.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.items.length} test(s){" "}
                  {o.doctorName ? `· Dr. ${o.doctorName}` : "· Direct booking"}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_STYLE[o.status] ?? ""}>
                {o.status.replace("_", " ")}
              </Badge>
              {o.status === "SAMPLE_PENDING" ? (
                <Button size="sm" onClick={() => setCollectFor(o)}>
                  Collect sample
                </Button>
              ) : null}
              {o.status === "COLLECTED" ? (
                <Button size="sm" variant="outline" onClick={() => startProcessing(o)}>
                  Start processing
                </Button>
              ) : null}
              {o.status === "PROCESSING" || o.status === "RESULT_READY" ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/lab/results" search={{ orderId: o.id }}>
                    Enter results
                  </Link>
                </Button>
              ) : null}
              {o.status === "VERIFIED" || o.status === "COMPLETED" ? (
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/lab/reports" search={{ orderId: o.id }}>
                    View report
                  </Link>
                </Button>
              ) : null}
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New lab order</DialogTitle>
            <DialogDescription>
              Booked directly, or ordered from a doctor's consultation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.firstName} {p.lastName ?? ""} · {p.patientNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tests</Label>
              <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {tests.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTests.includes(t.id)}
                        onCheckedChange={(v) =>
                          setSelectedTests((prev) =>
                            v ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                          )
                        }
                      />
                      {t.name}{" "}
                      <span className="text-xs text-muted-foreground">({t.sampleType})</span>
                    </span>
                    <span className="text-xs text-muted-foreground">₹{t.price}</span>
                  </label>
                ))}
              </div>
              {selectedTests.length ? (
                <p className="text-xs text-muted-foreground">Total: ₹{selectedTestsTotal}</p>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitOrder} disabled={submitting}>
                {submitting ? "Creating…" : "Create order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!collectFor} onOpenChange={(v) => !v && setCollectFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect sample</DialogTitle>
            <DialogDescription>
              {collectFor?.orderNumber} · {collectFor?.patient.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sample type(s)</Label>
              <Input
                value={sampleTypes}
                onChange={(e) => setSampleTypes(e.target.value)}
                placeholder="e.g. Blood"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setCollectFor(null)}>
                Cancel
              </Button>
              <Button onClick={submitCollection} disabled={collecting || !sampleTypes.trim()}>
                {collecting ? "Saving…" : "Mark collected"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
