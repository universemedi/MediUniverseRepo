import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, Lock, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/pharmacy/dispensing")({
  head: () => ({
    meta: [
      { title: "Dispensing — MediUnivers Pharmacy" },
      {
        name: "description",
        content:
          "The pharmacy queue: every completed consultation with a prescription, ready to dispense.",
      },
    ],
  }),
  component: DispensingPage,
});

interface QueueItem {
  consultationId: number;
  patientName: string;
  patientNumber: string;
  doctorName: string;
  medicineCount: number;
  pharmacyStatus: string;
}
interface PrescriptionItem {
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}
interface ConsultationDetail {
  id: number;
  prescriptionItems: PrescriptionItem[];
  patient: { id: number; name: string };
}
interface Medicine {
  id: number;
  name: string;
  controlled: boolean;
}
interface CartLine {
  medicineId: string;
  quantity: string;
  discount: string;
}

function DispensingPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [active, setActive] = useState<ConsultationDetail | null>(null);
  const [cart, setCart] = useState<CartLine[]>([{ medicineId: "", quantity: "1", discount: "0" }]);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadQueue() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<QueueItem[]>("/api/pharmacy/queue"),
      apiFetch<Medicine[]>("/api/pharmacy/medicines"),
    ])
      .then(([q, m]) => {
        setQueue(q);
        setMedicines(m);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load the pharmacy queue."),
      );
  }
  useEffect(loadQueue, [isPlatform, unavailable]);

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
        <h1 className="mt-4 text-lg font-semibold">Pharmacy isn't part of this organization</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  async function openConsultation(item: QueueItem) {
    try {
      const detail = await apiFetch<ConsultationDetail>(
        `/api/clinic/consultations/${item.consultationId}`,
      );
      setActive(detail);
      setCart([{ medicineId: "", quantity: "1", discount: "0" }]);
      setError(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load this prescription.");
    }
  }

  async function completeDispense() {
    if (!active) return;
    const valid = cart.filter((c) => c.medicineId && Number(c.quantity) > 0);
    if (!valid.length) return setError("Add at least one medicine to dispense.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/sales/dispense", {
        method: "POST",
        data: {
          patientId: active.patient.id,
          consultationId: active.id,
          branchId: branches.find((b) => b.headOffice)?.id ?? branches[0]?.id ?? null,
          paymentMode,
          items: valid.map((c) => ({
            medicineId: Number(c.medicineId),
            quantity: Number(c.quantity),
            discount: Number(c.discount) || 0,
          })),
        },
      });
      toast.success("Dispensed", {
        description: "Stock and the prescription queue have been updated.",
      });
      setActive(null);
      loadQueue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete dispensing.");
    } finally {
      setSubmitting(false);
    }
  }

  if (active) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{active.patient.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dispensing against this consultation's prescription.
            </p>
          </div>
          <Button variant="outline" onClick={() => setActive(null)}>
            Back to queue
          </Button>
        </div>

        <Card className="space-y-3 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Doctor prescribed
          </p>
          {active.prescriptionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescription items recorded.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {active.prescriptionItems.map((p, i) => (
                <li key={i} className="rounded-md border border-border px-3 py-2">
                  <span className="font-medium">{p.medicineName}</span>
                  {p.dosage ? ` · ${p.dosage}` : ""}
                  {p.frequency ? ` · ${p.frequency}` : ""}
                  {p.duration ? ` · ${p.duration}` : ""}
                  {p.instructions ? (
                    <span className="block text-xs text-muted-foreground">{p.instructions}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Match each prescribed medicine to your catalog below — batches are allocated
            automatically (oldest expiry first).
          </p>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dispense cart
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCart((c) => [...c, { medicineId: "", quantity: "1", discount: "0" }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add medicine
            </Button>
          </div>
          {cart.map((line, idx) => {
            const med = medicines.find((m) => String(m.id) === line.medicineId);
            return (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4"
              >
                <Select
                  value={line.medicineId}
                  onValueChange={(v) =>
                    setCart((c) => c.map((l, i) => (i === idx ? { ...l, medicineId: v } : l)))
                  }
                >
                  <SelectTrigger className="sm:col-span-2">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}
                        {m.controlled ? " ⚠" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) =>
                    setCart((c) =>
                      c.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                    )
                  }
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Discount ₹/unit"
                    value={line.discount}
                    onChange={(e) =>
                      setCart((c) =>
                        c.map((l, i) => (i === idx ? { ...l, discount: e.target.value } : l)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => setCart((c) => c.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {med?.controlled ? (
                  <p className="flex items-center gap-1 text-xs text-destructive sm:col-span-4">
                    <AlertTriangle className="h-3 w-3" /> Controlled medicine — confirm
                    authorization before dispensing.
                  </p>
                ) : null}
              </div>
            );
          })}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium">Payment mode</label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end border-t pt-4">
            <Button onClick={completeDispense} disabled={submitting}>
              {submitting ? "Dispensing…" : "Complete dispensing"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispensing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every completed consultation with a prescription lands here automatically.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !queue ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-6 w-6" />
          No prescriptions waiting right now.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {queue.map((q) => (
            <div key={q.consultationId} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{q.patientName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {q.patientNumber} · Dr. {q.doctorName} · {q.medicineCount} medicine(s)
                </p>
              </div>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                {q.pharmacyStatus.replace("_", " ")}
              </Badge>
              <Button size="sm" onClick={() => openConsultation(q)}>
                Dispense
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
