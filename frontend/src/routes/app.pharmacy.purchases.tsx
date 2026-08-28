import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Package, Plus, ShieldAlert, Trash2, Truck } from "lucide-react";
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

export const Route = createFileRoute("/app/pharmacy/purchases")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — MediUnivers Pharmacy" },
      { name: "description", content: "Order stock from suppliers and receive it in (GRN)." },
    ],
  }),
  component: PurchasesPage,
});

interface Supplier {
  id: number;
  name: string;
}
interface Medicine {
  id: number;
  name: string;
}
interface POItem {
  id: number;
  medicineName: string;
  quantityOrdered: number;
  quantityReceived: number;
  rate: number;
}
interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierName: string;
  status: string;
  createdAt: string;
  items: POItem[];
}

interface CartLine {
  medicineId: string;
  quantity: string;
  rate: string;
}
interface ReceiveLine {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  purchasePrice: string;
  mrp: string;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "text-muted-foreground",
  ORDERED: "border-amber-300 bg-amber-50 text-amber-700",
  PARTIALLY_RECEIVED: "border-amber-300 bg-amber-50 text-amber-700",
  RECEIVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
};

function PurchasesPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [orders, setOrders] = useState<PurchaseOrder[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [poOpen, setPoOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState("");
  const [poBranch, setPoBranch] = useState("");
  const [poItems, setPoItems] = useState<CartLine[]>([{ medicineId: "", quantity: "", rate: "" }]);
  const [poError, setPoError] = useState<string | null>(null);
  const [poSubmitting, setPoSubmitting] = useState(false);

  const [grnOpen, setGrnOpen] = useState(false);
  const [grnSupplier, setGrnSupplier] = useState("");
  const [grnBranch, setGrnBranch] = useState("");
  const [grnPoId, setGrnPoId] = useState("");
  const [grnItems, setGrnItems] = useState<ReceiveLine[]>([
    { medicineId: "", batchNumber: "", expiryDate: "", quantity: "", purchasePrice: "", mrp: "" },
  ]);
  const [grnError, setGrnError] = useState<string | null>(null);
  const [grnSubmitting, setGrnSubmitting] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<PurchaseOrder[]>("/api/pharmacy/purchase-orders"),
      apiFetch<Supplier[]>("/api/pharmacy/suppliers"),
      apiFetch<Medicine[]>("/api/pharmacy/medicines"),
    ])
      .then(([o, s, m]) => {
        setOrders(o);
        setSuppliers(s);
        setMedicines(m);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load purchase orders."),
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

  async function submitPo() {
    if (!poSupplier) return setPoError("Select a supplier.");
    const valid = poItems.filter((i) => i.medicineId && Number(i.quantity) > 0 && i.rate);
    if (!valid.length) return setPoError("Add at least one medicine line.");
    setPoError(null);
    setPoSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/purchase-orders", {
        method: "POST",
        data: {
          supplierId: Number(poSupplier),
          branchId: poBranch ? Number(poBranch) : null,
          items: valid.map((i) => ({
            medicineId: Number(i.medicineId),
            quantity: Number(i.quantity),
            rate: Number(i.rate),
          })),
        },
      });
      toast.success("Purchase order created");
      setPoOpen(false);
      setPoSupplier("");
      setPoBranch("");
      setPoItems([{ medicineId: "", quantity: "", rate: "" }]);
      load();
    } catch (err) {
      setPoError(err instanceof ApiError ? err.message : "Couldn't create this purchase order.");
    } finally {
      setPoSubmitting(false);
    }
  }

  async function submitGrn() {
    if (!grnSupplier) return setGrnError("Select a supplier.");
    const valid = grnItems.filter(
      (i) =>
        i.medicineId &&
        i.batchNumber &&
        i.expiryDate &&
        Number(i.quantity) > 0 &&
        i.purchasePrice &&
        i.mrp,
    );
    if (!valid.length) return setGrnError("Add at least one complete batch line.");
    setGrnError(null);
    setGrnSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/goods-receipts", {
        method: "POST",
        data: {
          supplierId: Number(grnSupplier),
          purchaseOrderId: grnPoId ? Number(grnPoId) : null,
          branchId: grnBranch ? Number(grnBranch) : null,
          items: valid.map((i) => ({
            medicineId: Number(i.medicineId),
            batchNumber: i.batchNumber,
            expiryDate: i.expiryDate,
            quantity: Number(i.quantity),
            purchasePrice: Number(i.purchasePrice),
            mrp: Number(i.mrp),
          })),
        },
      });
      toast.success("Goods receipt recorded", {
        description: "Batches and stock have been updated.",
      });
      setGrnOpen(false);
      setGrnSupplier("");
      setGrnBranch("");
      setGrnPoId("");
      setGrnItems([
        {
          medicineId: "",
          batchNumber: "",
          expiryDate: "",
          quantity: "",
          purchasePrice: "",
          mrp: "",
        },
      ]);
      load();
    } catch (err) {
      setGrnError(err instanceof ApiError ? err.message : "Couldn't record this receipt.");
    } finally {
      setGrnSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order stock from suppliers, then receive it in as batches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGrnOpen(true)}>
            <Package className="h-4 w-4" /> Receive goods
          </Button>
          <Button onClick={() => setPoOpen(true)}>
            <Plus className="h-4 w-4" /> New purchase order
          </Button>
        </div>
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
          No purchase orders yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((po) => (
            <div key={po.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {po.poNumber} · {po.supplierName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {po.items.length} line item(s)
                </p>
              </div>
              <Badge variant="outline" className={STATUS_STYLE[po.status] ?? ""}>
                {po.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
            <DialogDescription>Send an order to a supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={poSupplier} onValueChange={setPoSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={poBranch} onValueChange={setPoBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
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
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPoItems((p) => [...p, { medicineId: "", quantity: "", rate: "" }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add line
                </Button>
              </div>
              {poItems.map((line, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-4">
                  <Select
                    value={line.medicineId}
                    onValueChange={(v) =>
                      setPoItems((p) => p.map((l, i) => (i === idx ? { ...l, medicineId: v } : l)))
                    }
                  >
                    <SelectTrigger className="sm:col-span-2">
                      <SelectValue placeholder="Medicine" />
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
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) =>
                      setPoItems((p) =>
                        p.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                      )
                    }
                  />
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={(e) =>
                        setPoItems((p) =>
                          p.map((l, i) => (i === idx ? { ...l, rate: e.target.value } : l)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => setPoItems((p) => p.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {poError ? <p className="text-sm text-destructive">{poError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setPoOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitPo} disabled={poSubmitting}>
                {poSubmitting ? "Creating…" : "Create order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive goods (GRN)</DialogTitle>
            <DialogDescription>
              Each line creates a new batch with its own expiry and price.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={grnSupplier} onValueChange={setGrnSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={grnBranch} onValueChange={setGrnBranch}>
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
                <Label>Against PO (optional)</Label>
                <Select value={grnPoId} onValueChange={setGrnPoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {(orders ?? [])
                      .filter((o) => o.status === "ORDERED" || o.status === "PARTIALLY_RECEIVED")
                      .map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.poNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Batches received</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setGrnItems((p) => [
                      ...p,
                      {
                        medicineId: "",
                        batchNumber: "",
                        expiryDate: "",
                        quantity: "",
                        purchasePrice: "",
                        mrp: "",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add line
                </Button>
              </div>
              {grnItems.map((line, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6"
                >
                  <Select
                    value={line.medicineId}
                    onValueChange={(v) =>
                      setGrnItems((p) => p.map((l, i) => (i === idx ? { ...l, medicineId: v } : l)))
                    }
                  >
                    <SelectTrigger className="sm:col-span-2">
                      <SelectValue placeholder="Medicine" />
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
                    placeholder="Batch #"
                    value={line.batchNumber}
                    onChange={(e) =>
                      setGrnItems((p) =>
                        p.map((l, i) => (i === idx ? { ...l, batchNumber: e.target.value } : l)),
                      )
                    }
                  />
                  <Input
                    type="date"
                    value={line.expiryDate}
                    onChange={(e) =>
                      setGrnItems((p) =>
                        p.map((l, i) => (i === idx ? { ...l, expiryDate: e.target.value } : l)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) =>
                      setGrnItems((p) =>
                        p.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                      )
                    }
                  />
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="Purchase ₹"
                      value={line.purchasePrice}
                      onChange={(e) =>
                        setGrnItems((p) =>
                          p.map((l, i) =>
                            i === idx ? { ...l, purchasePrice: e.target.value } : l,
                          ),
                        )
                      }
                    />
                    <Input
                      type="number"
                      placeholder="MRP ₹"
                      value={line.mrp}
                      onChange={(e) =>
                        setGrnItems((p) =>
                          p.map((l, i) => (i === idx ? { ...l, mrp: e.target.value } : l)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => setGrnItems((p) => p.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {grnError ? <p className="text-sm text-destructive">{grnError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setGrnOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitGrn} disabled={grnSubmitting}>
                {grnSubmitting ? "Saving…" : "Record receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
