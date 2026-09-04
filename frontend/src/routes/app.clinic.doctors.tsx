import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Lock, Pencil, Plus, ShieldAlert, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError, resolveUploadUrl, uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/clinic/doctors")({
  head: () => ({
    meta: [
      { title: "Doctors — MediUnivers Clinic" },
      { name: "description", content: "Doctor profiles, specializations and weekly availability." },
    ],
  }),
  component: DoctorsPage,
});

interface Doctor {
  id: number;
  fullName: string;
  qualification: string | null;
  registrationNumber: string | null;
  photoUrl: string | null;
  experienceYears: number | null;
  consultationFee: number | null;
  taxPercent: number | null;
  specializations: string[];
  specializationIds: number[];
  visibleOnWebsite: boolean;
  status: string;
  email: string | null;
  branchId: number | null;
  branchName: string | null;
}

interface Specialization {
  id: number;
  code: string;
  name: string;
  platformDefault: boolean;
}

interface Branch {
  id: number;
  name: string;
  headOffice: boolean;
  status: string;
}

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  fullName?: string | undefined;
  email?: string | undefined;
  tempPassword?: string | undefined;
  registrationNumber?: string | undefined;
}

function DoctorsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("clinic");

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [taxRules, setTaxRules] = useState<{ id: number; name: string; percentage: number }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [deactivating, setDeactivating] = useState<Doctor | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [qualification, setQualification] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploadingFor, setPhotoUploadingFor] = useState<number | null>(null);
  const [experienceYears, setExperienceYears] = useState("");
  const [fee, setFee] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [selectedSpecs, setSelectedSpecs] = useState<number[]>([]);
  const [branchId, setBranchId] = useState("");
  const [visibleOnWebsite, setVisibleOnWebsite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [availabilityFor, setAvailabilityFor] = useState<Doctor | null>(null);
  const [availDays, setAvailDays] = useState<Set<string>>(new Set());
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("17:00");
  const [availSlot, setAvailSlot] = useState("15");
  const [savingAvailability, setSavingAvailability] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<Doctor[]>("/api/clinic/doctors"),
      apiFetch<Specialization[]>("/api/org/specializations"),
      apiFetch<{ id: number; name: string; percentage: number }[]>("/api/org/tax-rules"),
      apiFetch<Branch[]>("/api/org/branches"),
    ])
      .then(([d, s, t, b]) => {
        setDoctors(d);
        setSpecializations(s);
        setTaxRules(t);
        setBranches(b.filter((br) => br.status === "ACTIVE"));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load doctors."),
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
        <h1 className="mt-4 text-lg font-semibold">Clinic isn't part of this organization</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  function resetForm() {
    setEditing(null);
    setFullName("");
    setEmail("");
    setTempPassword("");
    setQualification("");
    setRegistrationNumber("");
    setPhotoUrl(null);
    setExperienceYears("");
    setFee("");
    setTaxPercent("0");
    setSelectedSpecs([]);
    setBranchId("");
    setVisibleOnWebsite(true);
    setError(null);
    setFieldErrors({});
  }

  function openEdit(d: Doctor) {
    setEditing(d);
    setFullName(d.fullName);
    setEmail(d.email ?? "");
    setTempPassword("");
    setQualification(d.qualification ?? "");
    setRegistrationNumber(d.registrationNumber ?? "");
    setPhotoUrl(d.photoUrl);
    setExperienceYears(d.experienceYears != null ? String(d.experienceYears) : "");
    setFee(d.consultationFee != null ? String(d.consultationFee) : "");
    setTaxPercent(d.taxPercent != null ? String(d.taxPercent) : "0");
    setSelectedSpecs(d.specializationIds);
    setBranchId(d.branchId != null ? String(d.branchId) : "");
    setVisibleOnWebsite(d.visibleOnWebsite);
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = "Full name is required.";
    if (!editing) {
      if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
      if (tempPassword.trim().length < 6)
        errors.tempPassword = "Temporary password must be at least 6 characters.";
    }
    if (!registrationNumber.trim())
      errors.registrationNumber = "Medical registration number is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateFields()) return;
    setError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await apiFetch(`/api/clinic/doctors/${editing.id}`, {
          method: "PUT",
          data: {
            fullName: fullName.trim(),
            qualification: qualification.trim() || null,
            registrationNumber: registrationNumber.trim(),
            experienceYears: experienceYears ? Number(experienceYears) : null,
            consultationFee: fee ? Number(fee) : null,
            taxPercent: Number(taxPercent) || 0,
            specializationIds: selectedSpecs,
            branchId: branchId ? Number(branchId) : null,
            visibleOnWebsite,
            status: editing.status,
          },
        });
        toast.success(`Dr. ${fullName.trim()} updated`);
      } else {
        await apiFetch("/api/clinic/doctors", {
          method: "POST",
          data: {
            fullName: fullName.trim(),
            email: email.trim(),
            tempPassword: tempPassword.trim(),
            qualification: qualification.trim() || null,
            registrationNumber: registrationNumber.trim(),
            photoUrl,
            experienceYears: experienceYears ? Number(experienceYears) : null,
            consultationFee: fee ? Number(fee) : null,
            taxPercent: Number(taxPercent) || 0,
            specializationIds: selectedSpecs,
            branchId: branchId ? Number(branchId) : null,
          },
        });
        toast.success(`Dr. ${fullName.trim()} added`, {
          description: "They can sign in with the temporary password.",
        });
      }
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this doctor. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    const doctor = deactivating;
    setDeactivating(null);
    try {
      await apiFetch(`/api/clinic/doctors/${doctor.id}`, { method: "DELETE" });
      toast.success(`Dr. ${doctor.fullName} deactivated`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate this doctor.");
    }
  }

  async function reactivateDoctor(d: Doctor) {
    try {
      await apiFetch(`/api/clinic/doctors/${d.id}`, {
        method: "PUT",
        data: {
          fullName: d.fullName,
          qualification: d.qualification,
          registrationNumber: d.registrationNumber,
          experienceYears: d.experienceYears,
          consultationFee: d.consultationFee,
          taxPercent: d.taxPercent ?? 0,
          specializationIds: d.specializationIds,
          branchId: d.branchId,
          visibleOnWebsite: d.visibleOnWebsite,
          status: "ACTIVE",
        },
      });
      toast.success(`Dr. ${d.fullName} reactivated`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reactivate this doctor.");
    }
  }

  async function updateDoctorPhoto(doctorId: number, url: string | null) {
    setPhotoUploadingFor(doctorId);
    try {
      await apiFetch(`/api/clinic/doctors/${doctorId}/photo`, {
        method: "PUT",
        data: { photoUrl: url },
      });
      setDoctors((prev) =>
        prev ? prev.map((d) => (d.id === doctorId ? { ...d, photoUrl: url } : d)) : prev,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update the photo.");
    } finally {
      setPhotoUploadingFor(null);
    }
  }

  function openAvailability(d: Doctor) {
    setAvailabilityFor(d);
    setAvailDays(new Set());
    apiFetch<{ dayOfWeek: string; startTime: string; endTime: string; slotMinutes: number }[]>(
      `/api/clinic/doctors/${d.id}/availability`,
    ).then((slots) => {
      if (slots.length) {
        setAvailDays(new Set(slots.map((s) => s.dayOfWeek)));
        setAvailStart(slots[0]!.startTime.slice(0, 5));
        setAvailEnd(slots[0]!.endTime.slice(0, 5));
        setAvailSlot(String(slots[0]!.slotMinutes));
      }
    });
  }

  async function saveAvailability() {
    if (!availabilityFor) return;
    setSavingAvailability(true);
    try {
      await apiFetch(`/api/clinic/doctors/${availabilityFor.id}/availability`, {
        method: "PUT",
        data: {
          slots: Array.from(availDays).map((day) => ({
            dayOfWeek: day,
            startTime: `${availStart}:00`,
            endTime: `${availEnd}:00`,
            slotMinutes: Number(availSlot) || 15,
          })),
        },
      });
      toast.success("Availability saved");
      setAvailabilityFor(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save availability.");
    } finally {
      setSavingAvailability(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Doctors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profiles, specializations and weekly availability.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add doctor
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !doctors ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No doctors yet — add your first one.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <Card key={d.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <label
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary",
                    photoUploadingFor === d.id && "opacity-60",
                  )}
                  title="Click to upload a photo"
                >
                  {d.photoUrl ? (
                    <img
                      src={resolveUploadUrl(d.photoUrl)}
                      alt={d.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Stethoscope className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={photoUploadingFor === d.id}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const { url } = await uploadFile("/api/org/uploads", file);
                        await updateDoctorPhoto(d.id, url);
                      } catch (err) {
                        toast.error(
                          err instanceof ApiError ? err.message : "Couldn't upload this photo.",
                        );
                      }
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Dr. {d.fullName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.qualification ?? "—"}
                    {d.registrationNumber ? ` · Reg. no. ${d.registrationNumber}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  onClick={() => openEdit(d)}
                  aria-label={`Edit Dr. ${d.fullName}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {d.specializations.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
                {branches.length > 1 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {d.branchName ?? "Every branch"}
                  </Badge>
                ) : null}
                {d.status !== "ACTIVE" ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/25 bg-destructive/10 text-[10px] text-destructive"
                  >
                    {d.status}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {d.experienceYears != null
                  ? `${d.experienceYears} yrs experience`
                  : "Experience not set"}
                {d.consultationFee != null ? ` · ₹${d.consultationFee} consult fee` : ""}
              </p>
              <div className="mt-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openAvailability(d)}
                >
                  <CalendarClock className="h-3.5 w-3.5" /> Availability
                </Button>
                {d.status === "ACTIVE" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeactivating(d)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => reactivateDoctor(d)}>
                    Reactivate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit doctor dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Dr. ${editing.fullName}` : "Add a doctor"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Photo, email and password are managed separately — see the card and Users."
                : "This creates their profile and their sign-in in one step."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {!editing ? (
              <ImageUploadField
                label="Photo"
                value={photoUrl}
                onChange={setPhotoUrl}
                uploadPath="/api/org/uploads"
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">
                  Full name <span className="font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="d-name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors(({ fullName: _, ...rest }) => rest);
                  }}
                  className={cn(fieldErrors.fullName && "border-destructive")}
                />
                {fieldErrors.fullName ? (
                  <p className="text-[11px] font-medium text-destructive">{fieldErrors.fullName}</p>
                ) : null}
              </div>
              {!editing ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-email">
                      Email <span className="font-bold text-destructive">*</span>
                    </Label>
                    <Input
                      id="d-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors(({ email: _, ...rest }) => rest);
                      }}
                      className={cn(fieldErrors.email && "border-destructive")}
                    />
                    {fieldErrors.email ? (
                      <p className="text-[11px] font-medium text-destructive">
                        {fieldErrors.email}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-pass">
                      Temporary password <span className="font-bold text-destructive">*</span>
                    </Label>
                    <Input
                      id="d-pass"
                      value={tempPassword}
                      onChange={(e) => {
                        setTempPassword(e.target.value);
                        if (fieldErrors.tempPassword)
                          setFieldErrors(({ tempPassword: _, ...rest }) => rest);
                      }}
                      className={cn(fieldErrors.tempPassword && "border-destructive")}
                    />
                    {fieldErrors.tempPassword ? (
                      <p className="text-[11px] font-medium text-destructive">
                        {fieldErrors.tempPassword}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="d-regno">
                  Medical registration number <span className="font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="d-regno"
                  placeholder="e.g. KMC-123456"
                  value={registrationNumber}
                  onChange={(e) => {
                    setRegistrationNumber(e.target.value);
                    if (fieldErrors.registrationNumber)
                      setFieldErrors(({ registrationNumber: _, ...rest }) => rest);
                  }}
                  className={cn(fieldErrors.registrationNumber && "border-destructive")}
                />
                {fieldErrors.registrationNumber ? (
                  <p className="text-[11px] font-medium text-destructive">
                    {fieldErrors.registrationNumber}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-qual">Qualification</Label>
                <Input
                  id="d-qual"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-exp">Experience (years)</Label>
                <Input
                  id="d-exp"
                  type="number"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-fee">Consultation fee</Label>
                <Input
                  id="d-fee"
                  type="number"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>GST</Label>
                <Select value={taxPercent} onValueChange={setTaxPercent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No GST</SelectItem>
                    {taxRules.map((t) => (
                      <SelectItem key={t.id} value={String(t.percentage)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.length > 1 ? (
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Available at every branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                          {b.headOffice ? " (Head office)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Specializations</Label>
              <div className="flex flex-wrap gap-3">
                {specializations.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSpecs.includes(s.id)}
                      onCheckedChange={(v) =>
                        setSelectedSpecs((prev) =>
                          v ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        )
                      }
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            {editing ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Show on public website</p>
                  <p className="text-xs text-muted-foreground">
                    Listed in the Doctors section of your org's public site when on.
                  </p>
                </div>
                <Switch checked={visibleOnWebsite} onCheckedChange={setVisibleOnWebsite} />
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editing
                    ? "Saving…"
                    : "Adding…"
                  : editing
                    ? "Save changes"
                    : "Add doctor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivating} onOpenChange={(v) => !v && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Dr. {deactivating?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll drop off booking and the public website, and their login will be disabled.
              Their appointment and prescription history is kept — this doesn't delete anything.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Availability dialog */}
      <Dialog open={!!availabilityFor} onOpenChange={(v) => !v && setAvailabilityFor(null)}>
        <DialogContent className="sm:max-w-md">
          {availabilityFor ? (
            <>
              <DialogHeader>
                <DialogTitle>Availability — Dr. {availabilityFor.fullName}</DialogTitle>
                <DialogDescription>
                  Pick the working days and hours used for booking slots.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={availDays.has(day)}
                        onCheckedChange={(v) =>
                          setAvailDays((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(day);
                            else next.delete(day);
                            return next;
                          })
                        }
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={availStart}
                      onChange={(e) => setAvailStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={availEnd}
                      onChange={(e) => setAvailEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slot (min)</Label>
                    <Input
                      type="number"
                      min="5"
                      value={availSlot}
                      onChange={(e) => setAvailSlot(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => setAvailabilityFor(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveAvailability}
                    disabled={savingAvailability || availDays.size === 0}
                  >
                    {savingAvailability ? "Saving…" : "Save availability"}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
