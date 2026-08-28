import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Lock, Plus, ShieldAlert, Stethoscope } from "lucide-react";
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
  experienceYears: number | null;
  consultationFee: number | null;
  taxPercent: number | null;
  specializations: string[];
  status: string;
  email: string | null;
}

interface Specialization {
  id: number;
  code: string;
  name: string;
  platformDefault: boolean;
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

function DoctorsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("clinic");

  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [taxRules, setTaxRules] = useState<{ id: number; name: string; percentage: number }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [fee, setFee] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [selectedSpecs, setSelectedSpecs] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

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
    ])
      .then(([d, s, t]) => {
        setDoctors(d);
        setSpecializations(s);
        setTaxRules(t);
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
    setFullName("");
    setEmail("");
    setTempPassword("");
    setQualification("");
    setExperienceYears("");
    setFee("");
    setTaxPercent("0");
    setSelectedSpecs([]);
    setError(null);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!fullName.trim()) return setError("Full name is required.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    if (tempPassword.trim().length < 6)
      return setError("Temporary password must be at least 6 characters.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/clinic/doctors", {
        method: "POST",
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          tempPassword: tempPassword.trim(),
          qualification: qualification.trim() || null,
          experienceYears: experienceYears ? Number(experienceYears) : null,
          consultationFee: fee ? Number(fee) : null,
          taxPercent: Number(taxPercent) || 0,
          specializationIds: selectedSpecs,
        },
      });
      toast.success(`Dr. ${fullName.trim()} added`, {
        description: "They can sign in with the temporary password.",
      });
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't add this doctor. Please try again.",
      );
    } finally {
      setSubmitting(false);
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
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Dr. {d.fullName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.qualification ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {d.specializations.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {d.experienceYears != null
                  ? `${d.experienceYears} yrs experience`
                  : "Experience not set"}
                {d.consultationFee != null ? ` · ₹${d.consultationFee} consult fee` : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto"
                onClick={() => openAvailability(d)}
              >
                <CalendarClock className="h-3.5 w-3.5" /> Manage availability
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Add doctor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a doctor</DialogTitle>
            <DialogDescription>
              This creates their profile and their sign-in in one step.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">Full name</Label>
                <Input
                  id="d-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={touched && !fullName.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-email">Email</Label>
                <Input
                  id="d-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    touched && !EMAIL_RE.test(email.trim()) ? "border-destructive" : undefined
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-pass">Temporary password</Label>
                <Input
                  id="d-pass"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className={
                    touched && tempPassword.trim().length < 6 ? "border-destructive" : undefined
                  }
                />
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add doctor"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
