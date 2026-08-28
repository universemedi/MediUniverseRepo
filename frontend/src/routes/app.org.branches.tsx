import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
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

export const Route = createFileRoute("/app/org/branches")({
  head: () => ({
    meta: [
      { title: "Branches — MediUnivers Organization" },
      {
        name: "description",
        content: "Every physical location your organization runs, and which modules each one uses.",
      },
    ],
  }),
  component: BranchesPage,
});

interface Branch {
  id: number;
  name: string;
  headOffice: boolean;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CLOSED";
  enabledModules: string[];
  email: string | null;
  phone: string | null;
  city: string | null;
}
interface OrgModuleStatus {
  group: "CLINIC" | "PHARMACY" | "LAB" | "CRM" | "CMS";
  enabled: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "text-muted-foreground",
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-amber-300 bg-amber-50 text-amber-700",
  SUSPENDED: "border-destructive/25 bg-destructive/10 text-destructive",
  CLOSED: "border-destructive/25 bg-destructive/10 text-destructive",
};
const STATUSES = ["DRAFT", "ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED"] as const;

function BranchesPage() {
  const { isPlatform, roleDef } = usePermissions();
  const canManage = !isPlatform && ["ORG_OWNER", "ORG_ADMIN"].includes(roleDef.key);

  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [availableModules, setAvailableModules] = useState<OrgModuleStatus[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (isPlatform) return;
    Promise.all([
      apiFetch<Branch[]>("/api/org/branches"),
      apiFetch<OrgModuleStatus[]>("/api/org/modules"),
    ])
      .then(([b, m]) => {
        setBranches(b);
        setAvailableModules(m.filter((x) => x.enabled));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load branches."),
      );
  }
  useEffect(load, [isPlatform]);

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

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCity("");
    setModules(availableModules.map((m) => m.group));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Branch name is required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/org/branches", {
        method: "POST",
        data: {
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          enabledModules: modules,
        },
      });
      toast.success(`${name.trim()} added`);
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't add this branch. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(branch: Branch, status: string) {
    try {
      await apiFetch(`/api/org/branches/${branch.id}/status`, {
        method: "PATCH",
        data: { status },
      });
      toast.success(`${branch.name} → ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this branch.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every physical location, and which of your enabled modules each one runs.
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New branch
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !branches ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((b) => (
            <Card key={b.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{b.name}</p>
                    {b.headOffice ? (
                      <p className="text-[11px] text-muted-foreground">Head office</p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_STYLE[b.status] ?? ""}>
                  {b.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {b.enabledModules.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No modules enabled at this branch
                  </span>
                ) : (
                  b.enabledModules.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] capitalize">
                      {m}
                    </Badge>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {b.city ?? "No city set"} {b.phone ? `· ${b.phone}` : ""}
              </p>
              {canManage && !b.headOffice ? (
                <div className="mt-auto pt-2">
                  <Select value={b.status} onValueChange={(v) => changeStatus(b, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New branch</DialogTitle>
            <DialogDescription>Subject to your subscription's branch limit.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-name">Branch name</Label>
                <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-email">Email</Label>
                <Input
                  id="b-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-phone">Phone</Label>
                <Input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-city">City</Label>
                <Input id="b-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modules this branch runs</Label>
              <div className="flex flex-wrap gap-3">
                {availableModules.map((m) => (
                  <label key={m.group} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={modules.includes(m.group)}
                      onCheckedChange={(v) =>
                        setModules((prev) =>
                          v ? [...prev, m.group] : prev.filter((g) => g !== m.group),
                        )
                      }
                    />
                    {m.group.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add branch"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
