import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Plus, Search, ShieldAlert, TestTube } from "lucide-react";
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

export const Route = createFileRoute("/app/lab/tests")({
  head: () => ({
    meta: [
      { title: "Test Master — MediUnivers Laboratory" },
      {
        name: "description",
        content: "The laboratory test catalogue, with reference ranges by gender.",
      },
    ],
  }),
  component: TestsPage,
});

interface RangeRow {
  gender: string;
  ageMin: string;
  ageMax: string;
  minValue: string;
  maxValue: string;
  criticalLow: string;
  criticalHigh: string;
  unit: string;
}
interface ReferenceRange {
  id: number;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
  minValue: number | null;
  maxValue: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  unit: string | null;
}
interface LabTest {
  id: number;
  code: string;
  name: string;
  category: string | null;
  department: string | null;
  sampleType: string;
  price: number;
  tatHours: number;
  status: string;
  referenceRanges: ReferenceRange[];
}
interface MasterItem {
  id: number;
  code: string;
  name: string;
  platformDefault: boolean;
}

const EMPTY_RANGE: RangeRow = {
  gender: "",
  ageMin: "",
  ageMax: "",
  minValue: "",
  maxValue: "",
  criticalLow: "",
  criticalHigh: "",
  unit: "",
};

function TestsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("lab");

  const [tests, setTests] = useState<LabTest[] | null>(null);
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sampleType, setSampleType] = useState("Blood");
  const [price, setPrice] = useState("");
  const [tatHours, setTatHours] = useState("24");
  const [ranges, setRanges] = useState<RangeRow[]>([{ ...EMPTY_RANGE }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(term?: string) {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<LabTest[]>(`/api/lab/tests${term ? `?search=${encodeURIComponent(term)}` : ""}`),
      apiFetch<MasterItem[]>("/api/lab/categories"),
    ])
      .then(([t, c]) => {
        setTests(t);
        setCategories(c);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load the test master."),
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

  function resetForm() {
    setCode("");
    setName("");
    setCategoryId("");
    setSampleType("Blood");
    setPrice("");
    setTatHours("24");
    setRanges([{ ...EMPTY_RANGE }]);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !price)
      return setError("Code, name and price are required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/lab/tests", {
        method: "POST",
        data: {
          code: code.trim(),
          name: name.trim(),
          categoryId: categoryId ? Number(categoryId) : null,
          sampleType: sampleType.trim(),
          price: Number(price),
          tatHours: Number(tatHours) || 24,
          referenceRanges: ranges
            .filter((r) => r.minValue || r.maxValue)
            .map((r) => ({
              gender: r.gender || null,
              ageMin: r.ageMin ? Number(r.ageMin) : null,
              ageMax: r.ageMax ? Number(r.ageMax) : null,
              minValue: r.minValue ? Number(r.minValue) : null,
              maxValue: r.maxValue ? Number(r.maxValue) : null,
              criticalLow: r.criticalLow ? Number(r.criticalLow) : null,
              criticalHigh: r.criticalHigh ? Number(r.criticalHigh) : null,
              unit: r.unit || null,
            })),
        },
      });
      toast.success(`${name.trim()} added to the test master`);
      setOpen(false);
      resetForm();
      load(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add this test. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Master</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every test in your catalogue, with reference ranges for automatic result flagging.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add test
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or code"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
        />
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !tests ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No tests yet — add your first one.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {tests.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TestTube className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.code} · {t.category ?? "Uncategorized"} · {t.sampleType} · {t.tatHours}h TAT
                </p>
              </div>
              <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                ₹{t.price}
              </Badge>
              {t.referenceRanges.length ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {t.referenceRanges.length} range(s)
                </Badge>
              ) : null}
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a test</DialogTitle>
            <DialogDescription>
              Reference ranges drive automatic Low/Normal/High/Critical flagging on results.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CBC" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Complete Blood Count"
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
                <Label>Sample type</Label>
                <Input
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  placeholder="Blood"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>TAT (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={tatHours}
                  onChange={(e) => setTatHours(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Reference ranges (optional, one row per gender/age band)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRanges((r) => [...r, { ...EMPTY_RANGE }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Add range
                </Button>
              </div>
              {ranges.map((r, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4"
                >
                  <Select
                    value={r.gender}
                    onValueChange={(v) =>
                      setRanges((rs) => rs.map((x, i) => (i === idx ? { ...x, gender: v } : x)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Min"
                    type="number"
                    value={r.minValue}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, minValue: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Max"
                    type="number"
                    value={r.maxValue}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, maxValue: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={r.unit}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Critical low"
                    type="number"
                    value={r.criticalLow}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, criticalLow: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Critical high"
                    type="number"
                    value={r.criticalHigh}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, criticalHigh: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Age min"
                    type="number"
                    value={r.ageMin}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, ageMin: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    placeholder="Age max"
                    type="number"
                    value={r.ageMax}
                    onChange={(e) =>
                      setRanges((rs) =>
                        rs.map((x, i) => (i === idx ? { ...x, ageMax: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
