import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { OrganizationApiDto, OrgTypeApiDto, PlanApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/platform/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations — MediUnivers Platform" },
      { name: "description", content: "Every tenant on the MediUnivers platform." },
    ],
  }),
  component: OrganizationsPage,
});

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "text-muted-foreground",
  PENDING_VERIFICATION: "text-muted-foreground",
  TRIAL: "border-sky-300 bg-sky-50 text-sky-700",
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  GRACE_PERIOD: "border-amber-300 bg-amber-50 text-amber-700",
  SUSPENDED: "border-destructive/25 bg-destructive/10 text-destructive",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  ARCHIVED: "text-muted-foreground",
};

interface CreateForm {
  organizationName: string;
  subdomain: string;
  orgTypeCode: string;
  planCode: string;
  headBranchName: string;
  ownerFullName: string;
  ownerEmail: string;
}

const EMPTY_FORM: CreateForm = {
  organizationName: "",
  subdomain: "",
  orgTypeCode: "",
  planCode: "",
  headBranchName: "Head Office",
  ownerFullName: "",
  ownerEmail: "",
};

function OrganizationsPage() {
  const { isPlatform, role } = usePermissions();
  const canCreate = role === "SUPER_ADMIN" || role === "PLATFORM_SALES_LEAD";

  const [orgs, setOrgs] = useState<OrganizationApiDto[] | null>(null);
  const [orgTypes, setOrgTypes] = useState<OrgTypeApiDto[]>([]);
  const [plans, setPlans] = useState<PlanApiDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!isPlatform) return;
    Promise.all([
      apiFetch<OrganizationApiDto[]>("/api/platform/organizations"),
      apiFetch<OrgTypeApiDto[]>("/api/public/org-types"),
      apiFetch<PlanApiDto[]>("/api/public/plans"),
    ])
      .then(([o, t, p]) => {
        setOrgs(o);
        setOrgTypes(t);
        setPlans(p);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load organizations."),
      );
  }
  useEffect(load, [isPlatform]);

  if (!isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Platform area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      orgTypeCode: orgTypes[0]?.code ?? "",
      planCode: plans[0]?.code ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.organizationName.trim() ||
      !form.orgTypeCode ||
      !form.planCode ||
      !form.headBranchName.trim() ||
      !form.ownerFullName.trim() ||
      !form.ownerEmail.trim()
    ) {
      setError("Please fill in every required field.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/platform/organizations", {
        method: "POST",
        data: {
          organizationName: form.organizationName.trim(),
          subdomain: form.subdomain.trim() || null,
          orgTypeCode: form.orgTypeCode,
          planCode: form.planCode,
          headBranchName: form.headBranchName.trim(),
          ownerFullName: form.ownerFullName.trim(),
          ownerEmail: form.ownerEmail.trim(),
          creationSource: "DIRECT_SALES",
        },
      });
      toast.success(`${form.organizationName.trim()} created`);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create this organization.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every tenant on the MediUnivers platform.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New organization
          </Button>
        ) : null}
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !orgs ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : orgs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-2 h-6 w-6" />
          No organizations yet.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-medium">{o.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.organizationCode} · {o.email ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>{o.orgType.name}</TableCell>
                  <TableCell>{o.plan.name}</TableCell>
                  <TableCell>{o.city ?? "—"}</TableCell>
                  <TableCell>{o.branches.length}</TableCell>
                  <TableCell>{o.renewsOn ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[o.status] ?? ""}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New organization</DialogTitle>
            <DialogDescription>
              Creates the organization, its head branch and an invited Org Owner in one step — for a
              deal already closed offline.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Organization name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Organization type<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Select
                  value={form.orgTypeCode}
                  onValueChange={(v) => setForm({ ...form, orgTypeCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orgTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Plan<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Select
                  value={form.planCode}
                  onValueChange={(v) => setForm({ ...form, planCode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Head branch name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.headBranchName}
                  onChange={(e) => setForm({ ...form, headBranchName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred subdomain</Label>
                <Input
                  value={form.subdomain}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Owner full name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.ownerFullName}
                  onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Owner email<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
