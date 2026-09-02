import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import ReactSelect from "react-select";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { OrganizationApiDto, OrgTypeApiDto, PlanApiDto } from "@/lib/types";
import { COUNTRIES, fetchIndiaCities, useIndiaStates } from "@/lib/indiaLocations";
import { cn } from "@/lib/utils";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { DataTable } from "@/components/common/DataTable";
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

const ALL_STATUSES = Object.keys(STATUS_STYLE);
const MANUAL_STATUSES = ["ACTIVE", "SUSPENDED", "CANCELLED"] as const;

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD_OFFLINE", label: "Card (offline / POS)" },
  { value: "ONLINE", label: "Online (payment link)" },
];

interface CreateForm {
  organizationName: string;
  subdomain: string;
  orgTypeCode: string;
  planCode: string;
  headBranchName: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string;
  country: string;
  state: string;
  city: string;
  gstNumber: string;
  paymentMethod: string;
}

const EMPTY_FORM: CreateForm = {
  organizationName: "",
  subdomain: "",
  orgTypeCode: "",
  planCode: "",
  headBranchName: "Head Office",
  ownerFullName: "",
  ownerEmail: "",
  ownerPhone: "",
  country: "India",
  state: "",
  city: "",
  gstNumber: "",
  paymentMethod: "",
};

type FieldErrors = Partial<Record<keyof CreateForm, string>>;

const selectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: "36px",
    borderColor: state.isFocused ? "var(--ring)" : "var(--input)",
    boxShadow: "none",
  }),
  menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 50 }),
};

function toRow(o: OrganizationApiDto): Row {
  return {
    id: String(o.id),
    organization: o.name,
    code: o.organizationCode,
    email: o.email ?? "",
    type: o.orgType.name,
    plan: o.plan.name,
    city: o.city ?? "",
    branches: o.branches.length,
    renews: o.renewsOn ?? "",
    status: o.status,
  };
}

function OrganizationsPage() {
  const { isPlatform, role } = usePermissions();
  const canCreate = role === "SUPER_ADMIN" || role === "PLATFORM_SALES_LEAD";
  const canChangeStatus = role === "SUPER_ADMIN" || role === "PLATFORM_FINANCE";

  const [orgs, setOrgs] = useState<OrganizationApiDto[] | null>(null);
  const [orgTypes, setOrgTypes] = useState<OrgTypeApiDto[]>([]);
  const [plans, setPlans] = useState<PlanApiDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const states = useIndiaStates();
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!form.state) {
      setCityOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchIndiaCities(form.state)
      .then((cities) => {
        if (!cancelled) setCityOptions(cities);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.state]);

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

  async function changeStatus(org: OrganizationApiDto, status: string) {
    try {
      await apiFetch(`/api/platform/organizations/${org.id}/status`, {
        method: "PATCH",
        data: { status },
      });
      toast.success(`${org.name} → ${status.replace("_", " ").toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this organization.");
    }
  }

  const columns = useMemo(
    () => [
      col("organization", "Organization", "org", { required: true }),
      col("code", "Code", "code", { secondary: true }),
      col("email", "Email", "email", { secondary: true }),
      col("type", "Type", "badge", { options: orgTypes.map((t) => t.name) }),
      col("plan", "Plan", "badge", { options: plans.map((p) => p.name) }),
      col("city", "City", "city"),
      col("branches", "Branches", "number"),
      col("renews", "Renews", "date"),
      col("status", "Status", "badge", {
        options: ALL_STATUSES,
        render: (r) => {
          const org = (orgs ?? []).find((o) => String(o.id) === r["id"]);
          if (!org) return null;
          if (!canChangeStatus) {
            return (
              <Badge variant="outline" className={STATUS_STYLE[org.status] ?? ""}>
                {org.status.replace("_", " ")}
              </Badge>
            );
          }
          return (
            <Select value={org.status} onValueChange={(v) => changeStatus(org, v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[org.status, ...MANUAL_STATUSES.filter((s) => s !== org.status)].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgs, orgTypes, plans, canChangeStatus],
  );

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
    // No org type / plan preselected — a platform staff member must explicitly
    // choose both rather than silently inheriting whatever happens to load first.
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setError(null);
    setOpen(true);
  }

  const selectedPlan = plans.find((p) => p.code === form.planCode);
  const paymentMethodRequired = Boolean(form.planCode) && !selectedPlan?.freeTrial;

  function validate(f: CreateForm): FieldErrors {
    const errs: FieldErrors = {};
    if (!f.organizationName.trim()) errs.organizationName = "Organization name is required.";
    if (!f.orgTypeCode) errs.orgTypeCode = "Choose an organization type.";
    if (!f.planCode) errs.planCode = "Choose a plan.";
    if (!f.headBranchName.trim()) errs.headBranchName = "Head branch name is required.";
    if (!f.ownerFullName.trim()) errs.ownerFullName = "Owner full name is required.";
    if (!f.ownerEmail.trim()) errs.ownerEmail = "Owner email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.ownerEmail.trim()))
      errs.ownerEmail = "Enter a valid email address.";
    if (!/^\d{10}$/.test(f.ownerPhone.replace(/\D/g, "")))
      errs.ownerPhone = "Enter a valid 10-digit phone number.";
    if (!f.country) errs.country = "Country is required.";
    if (!f.state) errs.state = "State is required.";
    if (!f.city) errs.city = "City is required.";
    const plan = plans.find((p) => p.code === f.planCode);
    if (f.planCode && !plan?.freeTrial && !f.paymentMethod)
      errs.paymentMethod = "Select how this deal was paid.";
    return errs;
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Please fix the highlighted fields.");
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
          ownerPhone: form.ownerPhone.replace(/\D/g, ""),
          country: form.country,
          state: form.state,
          city: form.city,
          gstNumber: form.gstNumber.trim() || null,
          paymentMethod: selectedPlan?.freeTrial ? null : form.paymentMethod,
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
        <DataTable
          id="platform/organizations"
          title="Organizations"
          rows={orgs.map(toRow)}
          columns={columns}
          canExport
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                  aria-invalid={!!fieldErrors.organizationName}
                  className={cn(fieldErrors.organizationName && "border-destructive")}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                />
                {fieldErrors.organizationName ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.organizationName}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Organization type<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Select
                  value={form.orgTypeCode}
                  onValueChange={(v) => setForm({ ...form, orgTypeCode: v })}
                >
                  <SelectTrigger className={cn(fieldErrors.orgTypeCode && "border-destructive")}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgTypes.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.orgTypeCode ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.orgTypeCode}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Plan<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Select
                  value={form.planCode}
                  onValueChange={(v) => setForm({ ...form, planCode: v, paymentMethod: "" })}
                >
                  <SelectTrigger className={cn(fieldErrors.planCode && "border-destructive")}>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.name}
                        {p.freeTrial ? " (free trial)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.planCode ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.planCode}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Head branch name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.headBranchName}
                  aria-invalid={!!fieldErrors.headBranchName}
                  className={cn(fieldErrors.headBranchName && "border-destructive")}
                  onChange={(e) => setForm({ ...form, headBranchName: e.target.value })}
                />
                {fieldErrors.headBranchName ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.headBranchName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Preferred subdomain</Label>
                <Input
                  value={form.subdomain}
                  onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                />
              </div>

              {paymentMethodRequired ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>
                    Payment method<span className="ml-1 font-bold text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.paymentMethod}
                    onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                  >
                    <SelectTrigger
                      className={cn(fieldErrors.paymentMethod && "border-destructive")}
                    >
                      <SelectValue placeholder="How did they pay for this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.paymentMethod ? (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.paymentMethod}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5 sm:col-span-2 border-t pt-4">
                <p className="text-sm font-medium text-foreground">Owner contact details</p>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Owner full name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.ownerFullName}
                  aria-invalid={!!fieldErrors.ownerFullName}
                  className={cn(fieldErrors.ownerFullName && "border-destructive")}
                  onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })}
                />
                {fieldErrors.ownerFullName ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.ownerFullName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Owner email<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.ownerEmail}
                  aria-invalid={!!fieldErrors.ownerEmail}
                  className={cn(fieldErrors.ownerEmail && "border-destructive")}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                />
                {fieldErrors.ownerEmail ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.ownerEmail}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Owner phone<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <div
                  className={cn(
                    "flex w-full overflow-hidden rounded-md border bg-background",
                    fieldErrors.ownerPhone ? "border-destructive" : "border-input",
                  )}
                >
                  <div className="flex shrink-0 items-center gap-1 border-r bg-muted/40 px-3 text-sm font-medium text-foreground">
                    <span aria-hidden="true">🇮🇳</span>
                    +91
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    className="border-0 focus-visible:ring-0"
                    value={form.ownerPhone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ownerPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    placeholder="9876543210"
                  />
                </div>
                {fieldErrors.ownerPhone ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.ownerPhone}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>
                  Country<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Select
                  value={form.country}
                  onValueChange={(v) => setForm({ ...form, country: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  State<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <ReactSelect
                  inputId="org-state"
                  instanceId="org-state"
                  isSearchable
                  options={states.map((s) => ({ label: s, value: s }))}
                  value={form.state ? { label: form.state, value: form.state } : null}
                  onChange={(opt) => setForm({ ...form, state: opt?.value ?? "", city: "" })}
                  placeholder="Select state"
                  styles={selectStyles}
                />
                {fieldErrors.state ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.state}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>
                  City<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <ReactSelect
                  inputId="org-city"
                  instanceId="org-city"
                  isSearchable
                  isDisabled={!form.state}
                  isLoading={loadingCities}
                  options={cityOptions.map((c) => ({ label: c, value: c }))}
                  value={form.city ? { label: form.city, value: form.city } : null}
                  onChange={(opt) => setForm({ ...form, city: opt?.value ?? "" })}
                  placeholder={form.state ? "Select city" : "Select a state first"}
                  styles={selectStyles}
                />
                {fieldErrors.city ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.city}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>GST number (optional)</Label>
                <Input
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
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
