import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Pill, Plus, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/app/pharmacy/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines — MediUnivers Pharmacy" },
      {
        name: "description",
        content: "The medicine master: categories, units, manufacturers and per-branch stock.",
      },
    ],
  }),
  component: MedicinesPage,
});

interface Medicine {
  id: number;
  code: string;
  name: string;
  category: string | null;
  unit: string | null;
  manufacturer: string | null;
  hsnCode: string | null;
  taxPercent: number;
  reorderLevel: number;
  controlled: boolean;
  allowSubstitution: boolean;
  status: string;
  availableStock: number;
}
interface MasterItem {
  id: number;
  code: string;
  name: string;
  platformDefault: boolean;
}

function MedicinesPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);
  const unavailable = !isPlatform && isUnavailable("pharmacy");

  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [units, setUnits] = useState<MasterItem[]>([]);
  const [manufacturers, setManufacturers] = useState<MasterItem[]>([]);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [manufacturerId, setManufacturerId] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [controlled, setControlled] = useState(false);
  const [allowSubstitution, setAllowSubstitution] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  function load(term?: string, branch?: number | null) {
    if (isPlatform || unavailable) return;
    const params = new URLSearchParams();
    if (term) params.set("search", term);
    if (branch) params.set("branchId", String(branch));
    Promise.all([
      apiFetch<Medicine[]>(`/api/pharmacy/medicines?${params.toString()}`),
      apiFetch<MasterItem[]>("/api/org/medicine-categories"),
      apiFetch<MasterItem[]>("/api/org/medicine-units"),
      apiFetch<MasterItem[]>("/api/org/manufacturers"),
    ])
      .then(([m, c, u, mf]) => {
        setMedicines(m);
        setCategories(c);
        setUnits(u);
        setManufacturers(mf);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load medicines."),
      );
  }

  useEffect(() => {
    if (branches.length && branchId === null) {
      const head = branches.find((b) => b.headOffice)?.id ?? branches[0]!.id;
      setBranchId(head);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  useEffect(() => {
    if (branchId !== null) load(search, branchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatform, unavailable, branchId]);

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
    setCode("");
    setName("");
    setCategoryId("");
    setUnitId("");
    setManufacturerId("");
    setHsnCode("");
    setTaxPercent("0");
    setReorderLevel("10");
    setControlled(false);
    setAllowSubstitution(true);
    setError(null);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!code.trim() || !name.trim()) return setError("Code and name are required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/pharmacy/medicines", {
        method: "POST",
        data: {
          code: code.trim(),
          name: name.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          unitId: unitId ? Number(unitId) : null,
          manufacturerId: manufacturerId ? Number(manufacturerId) : null,
          hsnCode: hsnCode.trim() || null,
          taxPercent: Number(taxPercent) || 0,
          reorderLevel: Number(reorderLevel) || 10,
          controlled,
          allowSubstitution,
        },
      });
      toast.success(`${name.trim()} added to the medicine master`);
      setOpen(false);
      resetForm();
      load(search, branchId);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't add this medicine. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medicines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The medicine master, shared across every branch.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add medicine
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or code"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              load(e.target.value, branchId);
            }}
          />
        </div>
        <Select
          value={branchId != null ? String(branchId) : ""}
          onValueChange={(v) => setBranchId(Number(v))}
        >
          <SelectTrigger className="w-48">
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
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !medicines ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No medicines yet — add your first one.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {medicines.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Pill className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.code} · {m.category ?? "Uncategorized"}{" "}
                  {m.manufacturer ? `· ${m.manufacturer}` : ""}
                </p>
              </div>
              {m.controlled ? (
                <Badge
                  variant="outline"
                  className="border-destructive/25 bg-destructive/10 text-destructive"
                >
                  Controlled
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={
                  m.availableStock < m.reorderLevel
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "text-muted-foreground"
                }
              >
                {m.availableStock} in stock
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a medicine</DialogTitle>
            <DialogDescription>
              Categories, units and manufacturers come from your organization's master data.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-code">Code</Label>
                <Input
                  id="m-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={touched && !code.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-name">Name</Label>
                <Input
                  id="m-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={touched && !name.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Manufacturer</Label>
                <Select value={manufacturerId} onValueChange={setManufacturerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturers.map((mf) => (
                      <SelectItem key={mf.id} value={String(mf.id)}>
                        {mf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-hsn">HSN code</Label>
                <Input id="m-hsn" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-tax">Tax %</Label>
                <Input
                  id="m-tax"
                  type="number"
                  min="0"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-reorder">Reorder level</Label>
                <Input
                  id="m-reorder"
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={controlled} onCheckedChange={(v) => setControlled(!!v)} />
                Controlled medicine
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allowSubstitution}
                  onCheckedChange={(v) => setAllowSubstitution(!!v)}
                />
                Allow substitution
              </label>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add medicine"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
