import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeftRight, CalendarClock, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
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

export const Route = createFileRoute("/app/pharmacy/stock")({
  head: () => ({
    meta: [
      { title: "Stock — MediUnivers Pharmacy" },
      {
        name: "description",
        content: "Low-stock reorder alerts, expiring batches, and branch-to-branch transfers.",
      },
    ],
  }),
  component: StockPage,
});

interface LowStock {
  medicineId: number;
  medicineName: string;
  reorderLevel: number;
  currentStock: number;
}
interface Expiring {
  batchId: number;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantityAvailable: number;
}
interface Medicine {
  id: number;
  name: string;
}

function StockPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [branchId, setBranchId] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<LowStock[] | null>(null);
  const [expiring, setExpiring] = useState<Expiring[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  useEffect(() => {
    if (!branchId && branches.length)
      setBranchId(branches.find((b) => b.headOffice)?.id ?? branches[0]!.id);
  }, [branches, branchId]);

  function load() {
    if (isPlatform || unavailable || !branchId) return;
    Promise.all([
      apiFetch<LowStock[]>(`/api/pharmacy/stock/low?branchId=${branchId}`),
      apiFetch<Expiring[]>("/api/pharmacy/stock/expiring?withinDays=30"),
      apiFetch<Medicine[]>("/api/pharmacy/medicines"),
    ])
      .then(([l, e, m]) => {
        setLowStock(l);
        setExpiring(e);
        setMedicines(m);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load stock data."),
      );
  }
  useEffect(load, [isPlatform, unavailable, branchId]);

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

  async function submitTransfer() {
    if (!fromBranch || !toBranch || !medicineId || !Number(quantity))
      return setTransferError("Fill in every field.");
    if (fromBranch === toBranch)
      return setTransferError("Source and destination branch must differ.");
    setTransferError(null);
    setTransferSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/stock-transfers", {
        method: "POST",
        data: {
          fromBranchId: Number(fromBranch),
          toBranchId: Number(toBranch),
          items: [{ medicineId: Number(medicineId), quantity: Number(quantity) }],
        },
      });
      toast.success("Stock transferred");
      setTransferOpen(false);
      setFromBranch("");
      setToBranch("");
      setMedicineId("");
      setQuantity("");
      load();
    } catch (err) {
      setTransferError(err instanceof ApiError ? err.message : "Couldn't complete this transfer.");
    } finally {
      setTransferSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reorder alerts, expiring batches, and branch transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={branchId ? String(branchId) : ""}
            onValueChange={(v) => setBranchId(Number(v))}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" /> Transfer stock
          </Button>
        </div>
      </div>

      {loadError ? <Card className="p-4 text-sm text-destructive">{loadError}</Card> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" /> Low stock — below reorder level
          </p>
          {!lowStock ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : lowStock.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nothing below its reorder level right now.
            </Card>
          ) : (
            <Card className="divide-y divide-border">
              {lowStock.map((l) => (
                <div key={l.medicineId} className="flex items-center justify-between p-3 text-sm">
                  <span>{l.medicineName}</span>
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                    {l.currentStock} / {l.reorderLevel}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Expiring within 30 days
          </p>
          {!expiring ? (
            <Skeleton className="h-32 rounded-lg" />
          ) : expiring.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No batches expiring soon.
            </Card>
          ) : (
            <Card className="divide-y divide-border">
              {expiring.map((b) => (
                <div key={b.batchId} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p>{b.medicineName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.batchNumber} · {b.quantityAvailable} units
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-destructive/25 bg-destructive/10 text-destructive"
                  >
                    {b.expiryDate}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer stock between branches</DialogTitle>
            <DialogDescription>
              Allocates from the oldest-expiring available batches at the source branch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>From branch</Label>
              <Select value={fromBranch} onValueChange={setFromBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To branch</Label>
              <Select value={toBranch} onValueChange={setToBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Medicine</Label>
              <Select value={medicineId} onValueChange={setMedicineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {medicines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {transferError ? <p className="text-sm text-destructive">{transferError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitTransfer} disabled={transferSubmitting}>
                {transferSubmitting ? "Transferring…" : "Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
