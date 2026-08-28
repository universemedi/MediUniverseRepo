import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Plus, ShieldAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/app/pharmacy/returns")({
  head: () => ({
    meta: [
      { title: "Returns — MediUnivers Pharmacy" },
      {
        name: "description",
        content: "Full or partial sales returns, always against the original invoice.",
      },
    ],
  }),
  component: ReturnsPage,
});

interface SaleItem {
  id: number;
  medicineName: string;
  quantity: number;
  quantityReturned: number;
  lineTotal: number;
}
interface Sale {
  id: number;
  saleNumber: string;
  patientName: string | null;
  items: SaleItem[];
  grandTotal: number;
}
interface ReturnRecord {
  id: number;
  returnNumber: string;
  saleNumber: string;
  reason: string;
  refundMode: string;
  refundAmount: number;
  createdAt: string;
}

function ReturnsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [returns, setReturns] = useState<ReturnRecord[] | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [reason, setReason] = useState("");
  const [refundMode, setRefundMode] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSale = sales.find((s) => String(s.id) === saleId) ?? null;

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<ReturnRecord[]>("/api/pharmacy/returns"),
      apiFetch<Sale[]>("/api/pharmacy/sales"),
    ])
      .then(([r, s]) => {
        setReturns(r);
        setSales(s);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load returns."),
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
        <h1 className="mt-4 text-lg font-semibold">Pharmacy isn't part of this organization</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  function resetForm() {
    setSaleId("");
    setQuantities({});
    setReason("");
    setRefundMode("CASH");
    setError(null);
  }

  async function submitReturn() {
    if (!selectedSale) return setError("Select the original sale.");
    if (!reason.trim()) return setError("A return reason is required.");
    const items = selectedSale.items
      .map((i) => ({ saleItemId: i.id, quantity: Number(quantities[i.id] ?? 0) }))
      .filter((i) => i.quantity > 0);
    if (!items.length) return setError("Enter a quantity to return for at least one item.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/returns", {
        method: "POST",
        data: { saleId: selectedSale.id, reason: reason.trim(), refundMode, items },
      });
      toast.success("Return processed", { description: "Stock has been credited back." });
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't process this return.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Always against the original sale — full or partial.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Undo2 className="h-4 w-4" /> New return
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !returns ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : returns.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No returns yet.</Card>
      ) : (
        <Card className="divide-y divide-border">
          {returns.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.returnNumber} · against {r.saleNumber}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                {r.refundMode}
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive/25 bg-destructive/10 text-destructive"
              >
                -₹{r.refundAmount}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New return</DialogTitle>
            <DialogDescription>
              Pick the original sale, then how much of each item to return.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Original sale</Label>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sale" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.saleNumber} · ₹{s.grandTotal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSale ? (
              <div className="space-y-2">
                <Label>Items</Label>
                {selectedSale.items.map((i) => {
                  const returnable = i.quantity - i.quantityReturned;
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <p>{i.medicineName}</p>
                        <p className="text-xs text-muted-foreground">
                          {returnable} of {i.quantity} returnable
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={returnable}
                        className="w-20"
                        value={quantities[i.id] ?? ""}
                        onChange={(e) => setQuantities((q) => ({ ...q, [i.id]: e.target.value }))}
                        disabled={returnable <= 0}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Wrong Medicine",
                      "Expired",
                      "Damaged",
                      "Doctor Changed",
                      "Customer Request",
                    ].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Refund via</Label>
                <Select value={refundMode} onValueChange={setRefundMode}>
                  <SelectTrigger>
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
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitReturn} disabled={submitting}>
                {submitting ? "Processing…" : "Process return"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
