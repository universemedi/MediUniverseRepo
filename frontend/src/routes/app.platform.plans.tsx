import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { PlanApiDto } from "@/lib/types";
import { ModulePricingCard } from "@/components/platform/ModulePricingCard";
import { AddonPricingCard } from "@/components/platform/AddonPricingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/platform/plans")({
  head: () => ({
    meta: [
      { title: "Plans — MediUnivers Platform" },
      { name: "description", content: "Subscription plans, pricing and usage limits." },
    ],
  }),
  component: PlansPage,
});

const BUSINESS_MODULES = ["CLINIC", "PHARMACY", "LAB", "CRM", "CMS"] as const;
const BASE_MODULES = ["ORG", "PATIENT"] as const;

interface FormState {
  code: string;
  name: string;
  tagline: string;
  maxBranches: string;
  maxUsers: string;
  maxDoctorsPerBranch: string;
  storageLabel: string;
  priceWithoutTax: string;
  priceWithoutTaxYearly: string;
  taxPercent: string;
  freeTrial: boolean;
  freeTrialDays: string;
  active: boolean;
  defaultSelected: boolean;
  validFrom: string;
  validTo: string;
  modules: string[];
  highlights: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  tagline: "",
  maxBranches: "1",
  maxUsers: "5",
  maxDoctorsPerBranch: "5",
  storageLabel: "1 GB",
  priceWithoutTax: "0",
  priceWithoutTaxYearly: "",
  taxPercent: "18",
  freeTrial: false,
  freeTrialDays: "0",
  active: true,
  defaultSelected: false,
  validFrom: "",
  validTo: "",
  modules: ["CLINIC"],
  highlights: "",
};

function toForm(p: PlanApiDto): FormState {
  return {
    code: p.code,
    name: p.name,
    tagline: p.tagline ?? "",
    maxBranches: String(p.maxBranches),
    maxUsers: String(p.maxUsers),
    maxDoctorsPerBranch: String(p.maxDoctorsPerBranch),
    storageLabel: p.storageLabel,
    priceWithoutTax: String(p.priceWithoutTax),
    priceWithoutTaxYearly: p.priceWithoutTaxYearly != null ? String(p.priceWithoutTaxYearly) : "",
    taxPercent: String(p.taxPercent),
    freeTrial: p.freeTrial,
    freeTrialDays: String(p.freeTrialDays),
    active: p.active,
    defaultSelected: p.defaultSelected,
    validFrom: p.validFrom ?? "",
    validTo: p.validTo ?? "",
    modules: p.modules.filter((m) => (BUSINESS_MODULES as readonly string[]).includes(m)),
    highlights: p.highlights.join("\n"),
  };
}

/** Single source of truth for field-level validation — reused for live (on-change) and
 * on-submit checks so the two can never drift out of sync. */
function validateField(key: keyof FormState, f: FormState, isEditing: boolean): string | undefined {
  switch (key) {
    case "name":
      return f.name.trim() ? undefined : "Plan name is required.";
    case "code":
      if (isEditing) return undefined;
      if (!f.code.trim()) return "Plan code is required.";
      if (!/^[A-Za-z0-9_-]+$/.test(f.code.trim())) return "Use letters, numbers, - or _ only.";
      return undefined;
    case "storageLabel":
      return f.storageLabel.trim() ? undefined : "Storage label is required.";
    case "maxBranches":
      return Number(f.maxBranches) >= 1 ? undefined : "Must be at least 1.";
    case "maxUsers":
      return Number(f.maxUsers) >= 1 ? undefined : "Must be at least 1.";
    case "maxDoctorsPerBranch":
      return Number(f.maxDoctorsPerBranch) >= 1 ? undefined : "Must be at least 1.";
    case "priceWithoutTax":
      return Number(f.priceWithoutTax) >= 0 && f.priceWithoutTax.trim() !== ""
        ? undefined
        : "Enter a valid price.";
    case "priceWithoutTaxYearly":
      if (f.priceWithoutTaxYearly.trim() === "") return undefined;
      return Number(f.priceWithoutTaxYearly) >= 0
        ? undefined
        : "Enter a valid price, or leave it blank.";
    case "taxPercent": {
      const n = Number(f.taxPercent);
      return f.taxPercent.trim() !== "" && n >= 0 && n <= 100 ? undefined : "Enter 0–100.";
    }
    case "freeTrialDays":
      if (!f.freeTrial) return undefined;
      return Number(f.freeTrialDays) >= 1 ? undefined : "Must be at least 1 day.";
    case "validTo":
      if (f.validFrom && f.validTo && f.validTo < f.validFrom) {
        return "End date can't be before the start date.";
      }
      return undefined;
    default:
      return undefined;
  }
}

const VALIDATED_FIELDS: (keyof FormState)[] = [
  "name",
  "code",
  "storageLabel",
  "maxBranches",
  "maxUsers",
  "maxDoctorsPerBranch",
  "priceWithoutTax",
  "priceWithoutTaxYearly",
  "taxPercent",
  "freeTrialDays",
  "validTo",
];

function validateAll(f: FormState, isEditing: boolean): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of VALIDATED_FIELDS) {
    const message = validateField(key, f, isEditing);
    if (message) errors[key] = message;
  }
  return errors;
}

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function PlansPage() {
  const { role, isPlatform } = usePermissions();
  const canManage = role === "SUPER_ADMIN";

  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanApiDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [deactivating, setDeactivating] = useState<PlanApiDto | null>(null);

  const fieldRefs = useRef<
    Partial<Record<keyof FormState, HTMLInputElement | HTMLButtonElement | null>>
  >({});

  /** Updates one field, and — once the field has been touched — re-validates just that
   * field live so its red border/error clears the moment the value becomes valid again. */
  function setField(key: keyof FormState, value: FormState[typeof key]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (touched[key]) {
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          [key]: validateField(key, next, !!editing),
        }));
      }
      return next;
    });
  }

  function handleBlur(key: keyof FormState) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateField(key, form, !!editing) }));
  }

  function load() {
    apiFetch<PlanApiDto[]>("/api/platform/plans")
      .then(setPlans)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load plans."));
  }
  useEffect(load, []);

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
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFieldErrors({});
    setTouched({});
    setOpen(true);
  }

  function openEdit(p: PlanApiDto) {
    setEditing(p);
    setForm(toForm(p));
    setError(null);
    setFieldErrors({});
    setTouched({});
    setOpen(true);
  }

  function toggleModule(group: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      modules: checked ? [...prev.modules, group] : prev.modules.filter((m) => m !== group),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateAll(form, !!editing);
    setFieldErrors(errors);
    setTouched(Object.fromEntries(VALIDATED_FIELDS.map((k) => [k, true])));

    const firstInvalid = VALIDATED_FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      tagline: form.tagline.trim() || null,
      maxBranches: Number(form.maxBranches) || 0,
      maxUsers: Number(form.maxUsers) || 0,
      maxDoctorsPerBranch: Number(form.maxDoctorsPerBranch) || 0,
      storageLabel: form.storageLabel.trim() || "1 GB",
      priceWithoutTax: Number(form.priceWithoutTax) || 0,
      priceWithoutTaxYearly:
        form.priceWithoutTaxYearly.trim() === "" ? null : Number(form.priceWithoutTaxYearly),
      taxPercent: Number(form.taxPercent) || 0,
      freeTrial: form.freeTrial,
      freeTrialDays: Number(form.freeTrialDays) || 0,
      active: form.active,
      defaultSelected: form.defaultSelected,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      modules: [...BASE_MODULES, ...form.modules],
      highlights: form.highlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean),
    };

    try {
      if (editing) {
        await apiFetch(`/api/platform/plans/${editing.id}`, { method: "PUT", data: payload });
        toast.success(`${form.name.trim()} updated`);
      } else {
        await apiFetch("/api/platform/plans", { method: "POST", data: payload });
        toast.success(`${form.name.trim()} created`);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this plan. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    try {
      await apiFetch(`/api/platform/plans/${deactivating.id}`, { method: "DELETE" });
      toast.success(`${deactivating.name} deactivated`);
      setDeactivating(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate this plan.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscription plans, pricing and usage limits shown on the public pricing page.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        ) : null}
      </div>

      {!canManage ? (
        <Card className="border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          Only Super Admins can create, edit or deactivate plans. You have read-only access.
        </Card>
      ) : null}

      <ModulePricingCard readOnly={!canManage} />

      <AddonPricingCard readOnly={!canManage} />

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !plans ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <Card key={p.id} className={`flex flex-col gap-3 p-4 ${!p.active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.code}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {p.defaultSelected ? <Badge>Default</Badge> : null}
                  {!p.active ? <Badge variant="outline">Inactive</Badge> : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{p.tagline}</p>
              <div className="text-lg font-semibold">
                {p.freeTrial ? `Free / ${p.freeTrialDays} days` : currency(p.priceWithTax)}
                {!p.freeTrial ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / month (incl. {p.taxPercent}% tax)
                  </span>
                ) : null}
              </div>
              {!p.freeTrial ? (
                <p className="text-[11px] text-muted-foreground">
                  {currency(p.priceWithoutTax)} + tax ·{" "}
                  {currency(p.priceWithTaxYearly ?? p.priceWithTax * 12)} / year (incl. tax)
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{p.maxBranches} branches</span>
                <span>{p.maxUsers} users</span>
                <span>{p.maxDoctorsPerBranch} doctors/branch</span>
                <span>{p.storageLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.modules.map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px] capitalize">
                    {m.toLowerCase()}
                  </Badge>
                ))}
              </div>
              {canManage ? (
                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </Button>
                  {p.active ? (
                    <Button size="sm" variant="outline" onClick={() => setDeactivating(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New plan"}</DialogTitle>
            <DialogDescription>
              Shown on the public pricing page and used to gate module access, branch/doctor/user
              limits.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">
                  Plan name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-name"
                  ref={(el) => {
                    fieldRefs.current.name = el;
                  }}
                  value={form.name}
                  aria-invalid={!!(touched.name && fieldErrors.name)}
                  className={cn(
                    touched.name &&
                      fieldErrors.name &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                />
                {touched.name && fieldErrors.name ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.name}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-code">
                  Code{!editing ? <span className="ml-1 font-bold text-destructive">*</span> : null}
                </Label>
                <Input
                  id="p-code"
                  ref={(el) => {
                    fieldRefs.current.code = el;
                  }}
                  value={form.code}
                  disabled={!!editing}
                  aria-invalid={!!(touched.code && fieldErrors.code)}
                  className={cn(
                    touched.code &&
                      fieldErrors.code &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("code", e.target.value)}
                  onBlur={() => handleBlur("code")}
                  placeholder="STARTER"
                />
                {touched.code && fieldErrors.code ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.code}</p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-tagline">Tagline</Label>
                <Input
                  id="p-tagline"
                  value={form.tagline}
                  onChange={(e) => setField("tagline", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-branches">
                  Max branches<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-branches"
                  ref={(el) => {
                    fieldRefs.current.maxBranches = el;
                  }}
                  type="number"
                  min={1}
                  value={form.maxBranches}
                  aria-invalid={!!(touched.maxBranches && fieldErrors.maxBranches)}
                  className={cn(
                    touched.maxBranches &&
                      fieldErrors.maxBranches &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("maxBranches", e.target.value)}
                  onBlur={() => handleBlur("maxBranches")}
                />
                {touched.maxBranches && fieldErrors.maxBranches ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.maxBranches}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-users">
                  Max users<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-users"
                  ref={(el) => {
                    fieldRefs.current.maxUsers = el;
                  }}
                  type="number"
                  min={1}
                  value={form.maxUsers}
                  aria-invalid={!!(touched.maxUsers && fieldErrors.maxUsers)}
                  className={cn(
                    touched.maxUsers &&
                      fieldErrors.maxUsers &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("maxUsers", e.target.value)}
                  onBlur={() => handleBlur("maxUsers")}
                />
                {touched.maxUsers && fieldErrors.maxUsers ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.maxUsers}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-doctors">
                  Max doctors / branch<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-doctors"
                  ref={(el) => {
                    fieldRefs.current.maxDoctorsPerBranch = el;
                  }}
                  type="number"
                  min={1}
                  value={form.maxDoctorsPerBranch}
                  aria-invalid={!!(touched.maxDoctorsPerBranch && fieldErrors.maxDoctorsPerBranch)}
                  className={cn(
                    touched.maxDoctorsPerBranch &&
                      fieldErrors.maxDoctorsPerBranch &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("maxDoctorsPerBranch", e.target.value)}
                  onBlur={() => handleBlur("maxDoctorsPerBranch")}
                />
                {touched.maxDoctorsPerBranch && fieldErrors.maxDoctorsPerBranch ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.maxDoctorsPerBranch}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-storage">
                  Storage label<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-storage"
                  ref={(el) => {
                    fieldRefs.current.storageLabel = el;
                  }}
                  value={form.storageLabel}
                  aria-invalid={!!(touched.storageLabel && fieldErrors.storageLabel)}
                  className={cn(
                    touched.storageLabel &&
                      fieldErrors.storageLabel &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("storageLabel", e.target.value)}
                  onBlur={() => handleBlur("storageLabel")}
                />
                {touched.storageLabel && fieldErrors.storageLabel ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.storageLabel}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">
                  Price without tax (₹ / month)
                  <span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-price"
                  ref={(el) => {
                    fieldRefs.current.priceWithoutTax = el;
                  }}
                  type="number"
                  min={0}
                  value={form.priceWithoutTax}
                  aria-invalid={!!(touched.priceWithoutTax && fieldErrors.priceWithoutTax)}
                  className={cn(
                    touched.priceWithoutTax &&
                      fieldErrors.priceWithoutTax &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("priceWithoutTax", e.target.value)}
                  onBlur={() => handleBlur("priceWithoutTax")}
                />
                {touched.priceWithoutTax && fieldErrors.priceWithoutTax ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.priceWithoutTax}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price-yearly">Price without tax (₹ / year)</Label>
                <Input
                  id="p-price-yearly"
                  ref={(el) => {
                    fieldRefs.current.priceWithoutTaxYearly = el;
                  }}
                  type="number"
                  min={0}
                  placeholder="monthly × 12 if blank"
                  value={form.priceWithoutTaxYearly}
                  aria-invalid={
                    !!(touched.priceWithoutTaxYearly && fieldErrors.priceWithoutTaxYearly)
                  }
                  className={cn(
                    touched.priceWithoutTaxYearly &&
                      fieldErrors.priceWithoutTaxYearly &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("priceWithoutTaxYearly", e.target.value)}
                  onBlur={() => handleBlur("priceWithoutTaxYearly")}
                />
                {touched.priceWithoutTaxYearly && fieldErrors.priceWithoutTaxYearly ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.priceWithoutTaxYearly}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-tax">
                  Tax percent (GST)<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-tax"
                  ref={(el) => {
                    fieldRefs.current.taxPercent = el;
                  }}
                  type="number"
                  min={0}
                  max={100}
                  value={form.taxPercent}
                  aria-invalid={!!(touched.taxPercent && fieldErrors.taxPercent)}
                  className={cn(
                    touched.taxPercent &&
                      fieldErrors.taxPercent &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("taxPercent", e.target.value)}
                  onBlur={() => handleBlur("taxPercent")}
                />
                {touched.taxPercent && fieldErrors.taxPercent ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.taxPercent}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-valid-from">Available from</Label>
                <DatePicker
                  id="p-valid-from"
                  ref={(el) => {
                    fieldRefs.current.validFrom = el;
                  }}
                  value={form.validFrom || null}
                  onChange={(v) => {
                    const next = { ...form, validFrom: v ?? "" };
                    setForm(next);
                    if (touched.validTo) {
                      const message = validateField("validTo", next, !!editing);
                      setFieldErrors((prev) => {
                        const copy: FieldErrors = { ...prev };
                        if (message) copy.validTo = message;
                        else delete copy.validTo;
                        return copy;
                      });
                    }
                  }}
                  placeholder="No start limit"
                  max={form.validTo || undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-valid-to">Available until</Label>
                <DatePicker
                  id="p-valid-to"
                  ref={(el) => {
                    fieldRefs.current.validTo = el;
                  }}
                  value={form.validTo || null}
                  onChange={(v) => {
                    setField("validTo", v ?? "");
                    setTouched((prev) => ({ ...prev, validTo: true }));
                  }}
                  placeholder="No end limit"
                  min={form.validFrom || undefined}
                  invalid={!!(touched.validTo && fieldErrors.validTo)}
                />
                {touched.validTo && fieldErrors.validTo ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.validTo}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Leave both dates empty to keep this plan available indefinitely.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="p-trial" className="text-sm">
                  Free trial plan
                </Label>
                <p className="text-xs text-muted-foreground">
                  No payment required; auto-expires after the trial days below.
                </p>
              </div>
              <Switch
                id="p-trial"
                checked={form.freeTrial}
                onCheckedChange={(v) => setField("freeTrial", v)}
              />
            </div>
            {form.freeTrial ? (
              <div className="space-y-1.5">
                <Label htmlFor="p-trial-days">
                  Free trial days<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-trial-days"
                  ref={(el) => {
                    fieldRefs.current.freeTrialDays = el;
                  }}
                  type="number"
                  min={1}
                  value={form.freeTrialDays}
                  aria-invalid={!!(touched.freeTrialDays && fieldErrors.freeTrialDays)}
                  className={cn(
                    touched.freeTrialDays &&
                      fieldErrors.freeTrialDays &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("freeTrialDays", e.target.value)}
                  onBlur={() => handleBlur("freeTrialDays")}
                />
                {touched.freeTrialDays && fieldErrors.freeTrialDays ? (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.freeTrialDays}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="p-active" className="text-sm">
                Active (visible on the public pricing page)
              </Label>
              <Switch
                id="p-active"
                checked={form.active}
                onCheckedChange={(v) => setField("active", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="p-default" className="text-sm">
                  Default plan
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pre-selected on the public plan picker. Turning this on unsets it on every other
                  plan.
                </p>
              </div>
              <Switch
                id="p-default"
                checked={form.defaultSelected}
                onCheckedChange={(v) => setField("defaultSelected", v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Modules included</Label>
              <div className="flex flex-wrap gap-3">
                {BUSINESS_MODULES.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={form.modules.includes(g)}
                      onCheckedChange={(v) => toggleModule(g, !!v)}
                    />
                    {g.toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-highlights">Highlights (one per line)</Label>
              <Textarea
                id="p-highlights"
                rows={4}
                value={form.highlights}
                onChange={(e) => setField("highlights", e.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivating} onOpenChange={(v) => !v && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the public pricing page. Existing organizations on this plan
              are unaffected. This is blocked if any organization currently has an active
              subscription on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
