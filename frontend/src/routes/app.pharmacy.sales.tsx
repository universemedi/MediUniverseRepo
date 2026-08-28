import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeIndianRupee, Lock, Plus, ShieldAlert, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/app/pharmacy/sales")({
  head: () => ({
    meta: [
      { title: "Sales — MediUnivers Pharmacy" },
      { name: "description", content: "Walk-in counter sales and the sales history." },
    ],
  }),
  component: SalesPage,
});

interface Medicine {
  id: number;
  name: string;
  controlled: boolean;
}
interface SaleItem {
  id: number;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  quantityReturned: number;
  mrp: number;
  discount: number;
  taxPercent: number;
  lineTotal: number;
}
interface Sale {
  id: number;
  saleNumber: string;
  type: string;
  status: string;
  patientName: string | null;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMode: string;
  createdAt: string;
}
interface CartLine {
  medicineId: string;
  quantity: string;
  discount: string;
}

function SalesPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [sales, setSales] = useState<Sale[] | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(true);

  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([{ medicineId: "", quantity: "1", discount: "0" }]);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<Sale[]>(`/api/pharmacy/sales?today=${todayOnly}`),
      apiFetch<Medicine[]>("/api/pharmacy/medicines"),
    ])
      .then(([s, m]) => {
        setSales(s);
        setMedicines(m);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load sales."));
  }
  useEffect(load, [isPlatform, unavailable, todayOnly]);

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

  async function completeSale() {
    const valid = cart.filter((c) => c.medicineId && Number(c.quantity) > 0);
    if (!valid.length) return setError("Add at least one medicine.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/sales/walk-in", {
        method: "POST",
        data: {
          branchId: branches.find((b) => b.headOffice)?.id ?? branches[0]?.id ?? null,
          paymentMode,
          items: valid.map((c) => ({
            medicineId: Number(c.medicineId),
            quantity: Number(c.quantity),
            discount: Number(c.discount) || 0,
          })),
        },
      });
      toast.success("Sale completed");
      setOpen(false);
      setCart([{ medicineId: "", quantity: "1", discount: "0" }]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete this sale.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Walk-in counter sales and history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={todayOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setTodayOnly(true)}
          >
            Today
          </Button>
          <Button
            variant={!todayOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setTodayOnly(false)}
          >
            All
          </Button>
          <Button onClick={() => setOpen(true)}>
            <ShoppingCart className="h-4 w-4" /> New walk-in sale
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !sales ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No sales yet.</Card>
      ) : (
        <Card className="divide-y divide-border">
          {sales.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BadgeIndianRupee className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {s.saleNumber} {s.patientName ? `· ${s.patientName}` : "· Walk-in"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.items.length} item(s) · {s.paymentMode}
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                {s.type === "PRESCRIPTION" ? "Prescription" : "Walk-in"}
              </Badge>
              <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                ₹{s.grandTotal}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New walk-in sale</DialogTitle>
            <DialogDescription>No patient registration required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Cart</p>
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
            {cart.map((line, idx) => (
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
              </div>
            ))}
            <div className="space-y-1.5">
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
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={completeSale} disabled={submitting}>
                {submitting ? "Completing…" : "Complete sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
