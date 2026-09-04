import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Lock, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
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

export const Route = createFileRoute("/app/clinic/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments & Queue — MediUnivers Clinic" },
      {
        name: "description",
        content: "Book appointments, register walk-ins and run the reception queue.",
      },
    ],
  }),
  component: AppointmentsPage,
});

interface Appointment {
  id: number;
  appointmentNumber: string;
  tokenNumber: string | null;
  type: "SCHEDULED" | "WALK_IN";
  status: "BOOKED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  appointmentDate: string;
  scheduledAt: string | null;
  reason: string | null;
  patient: { id: number; patientNumber: string; name: string; phone: string | null };
  doctor: { id: number; fullName: string };
}

interface Patient {
  id: number;
  firstName: string;
  lastName: string | null;
  patientNumber: string;
}

interface Doctor {
  id: number;
  fullName: string;
}

interface FieldErrors {
  patientId?: string | undefined;
  doctorId?: string | undefined;
}

const STATUS_STYLE: Record<Appointment["status"], string> = {
  BOOKED: "border-border text-muted-foreground",
  CHECKED_IN: "border-amber-300 bg-amber-50 text-amber-700",
  IN_CONSULTATION: "border-primary/25 bg-primary/10 text-primary",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  NO_SHOW: "border-destructive/25 bg-destructive/10 text-destructive",
};

function AppointmentsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const navigate = useNavigate();
  const unavailable = !isPlatform && isUnavailable("clinic");

  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"book" | "walkin" | null>(null);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<Appointment[]>("/api/clinic/appointments"),
      apiFetch<Patient[]>("/api/clinic/patients"),
      apiFetch<Doctor[]>("/api/clinic/doctors"),
    ])
      .then(([a, p, d]) => {
        setAppointments(a);
        setPatients(p);
        setDoctors(d);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load appointments."),
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
    setPatientId("");
    setDoctorId("");
    setReason("");
    setError(null);
    setFieldErrors({});
  }

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (!patientId) errors.patientId = "Select a patient.";
    if (!doctorId) errors.doctorId = "Select a doctor.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitBooking() {
    if (!validateFields()) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "walkin") {
        await apiFetch("/api/clinic/appointments/walk-in", {
          method: "POST",
          data: {
            patientId: Number(patientId),
            doctorId: Number(doctorId),
            reason: reason.trim() || null,
          },
        });
        toast.success("Walk-in checked in", { description: "A token has been issued." });
      } else {
        await apiFetch("/api/clinic/appointments", {
          method: "POST",
          data: {
            patientId: Number(patientId),
            doctorId: Number(doctorId),
            appointmentDate: date,
            reason: reason.trim() || null,
          },
        });
        toast.success("Appointment booked");
      }
      setMode(null);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openReschedule(a: Appointment) {
    setRescheduling(a);
    setRescheduleDate(a.appointmentDate);
    setRescheduleDoctorId(String(a.doctor.id));
    setRescheduleError(null);
  }

  async function submitReschedule() {
    if (!rescheduling) return;
    if (!rescheduleDate) {
      setRescheduleError("Choose a date.");
      return;
    }
    setRescheduleError(null);
    setRescheduleSubmitting(true);
    try {
      await apiFetch(`/api/clinic/appointments/${rescheduling.id}/reschedule`, {
        method: "PUT",
        data: {
          appointmentDate: rescheduleDate,
          doctorId: rescheduleDoctorId ? Number(rescheduleDoctorId) : null,
        },
      });
      toast.success(`${rescheduling.patient.name}'s appointment rescheduled`);
      setRescheduling(null);
      load();
    } catch (err) {
      setRescheduleError(
        err instanceof ApiError ? err.message : "Couldn't reschedule this appointment.",
      );
    } finally {
      setRescheduleSubmitting(false);
    }
  }

  async function transition(a: Appointment, status: string) {
    try {
      await apiFetch(`/api/clinic/appointments/${a.id}/status`, {
        method: "PUT",
        data: { status },
      });
      toast.success(`${a.patient.name} → ${status.replace("_", " ").toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update status.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments & Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today's token queue, plus booking and walk-in check-in.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setMode("walkin");
            }}
          >
            <UserPlus className="h-4 w-4" /> Walk-in
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setMode("book");
            }}
          >
            <CalendarPlus className="h-4 w-4" /> Book appointment
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !appointments ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No appointments today — book one or check in a walk-in.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {appointments.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                {a.tokenNumber ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.patient.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.patient.patientNumber} · Dr. {a.doctor.fullName} · {a.appointmentNumber}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_STYLE[a.status]}>
                {a.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                {a.type === "WALK_IN" ? "Walk-in" : "Scheduled"}
              </Badge>

              <div className="flex gap-1.5">
                {a.status === "BOOKED" ? (
                  <Button size="sm" variant="outline" onClick={() => transition(a, "CHECKED_IN")}>
                    Check in
                  </Button>
                ) : null}
                {a.status === "BOOKED" || a.status === "NO_SHOW" ? (
                  <Button size="sm" variant="outline" onClick={() => openReschedule(a)}>
                    Reschedule
                  </Button>
                ) : null}
                {a.status === "BOOKED" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => transition(a, "NO_SHOW")}
                  >
                    No-show
                  </Button>
                ) : null}
                {a.status === "BOOKED" || a.status === "CHECKED_IN" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => transition(a, "CANCELLED")}
                  >
                    Cancel
                  </Button>
                ) : null}
                {a.status === "CHECKED_IN" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({ to: "/app/clinic/consultations", search: { appointmentId: a.id } })
                    }
                  >
                    Start consultation
                  </Button>
                ) : null}
                {a.status === "IN_CONSULTATION" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({ to: "/app/clinic/consultations", search: { appointmentId: a.id } })
                    }
                  >
                    Resume
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={!!mode} onOpenChange={(v) => !v && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "walkin" ? "Check in a walk-in" : "Book an appointment"}
            </DialogTitle>
            <DialogDescription>
              {mode === "walkin"
                ? "A token is issued immediately."
                : "Choose a patient, doctor and date."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Patient <span className="font-bold text-destructive">*</span>
              </Label>
              <Select
                value={patientId}
                onValueChange={(v) => {
                  setPatientId(v);
                  if (fieldErrors.patientId) setFieldErrors(({ patientId: _, ...rest }) => rest);
                }}
              >
                <SelectTrigger className={cn(fieldErrors.patientId && "border-destructive")}>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.firstName} {p.lastName ?? ""} · {p.patientNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.patientId ? (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.patientId}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>
                Doctor <span className="font-bold text-destructive">*</span>
              </Label>
              <Select
                value={doctorId}
                onValueChange={(v) => {
                  setDoctorId(v);
                  if (fieldErrors.doctorId) setFieldErrors(({ doctorId: _, ...rest }) => rest);
                }}
              >
                <SelectTrigger className={cn(fieldErrors.doctorId && "border-destructive")}>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      Dr. {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.doctorId ? (
                <p className="text-[11px] font-medium text-destructive">{fieldErrors.doctorId}</p>
              ) : null}
            </div>
            {mode === "book" ? (
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Follow-up, fever"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button onClick={submitBooking} disabled={submitting}>
                {submitting ? "Saving…" : mode === "walkin" ? "Check in" : "Book"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduling} onOpenChange={(v) => !v && setRescheduling(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule {rescheduling?.patient.name}'s appointment</DialogTitle>
            <DialogDescription>
              Pick a new date, and a different doctor if needed — the patient will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                New date <span className="font-bold text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={rescheduleDoctorId} onValueChange={setRescheduleDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      Dr. {d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rescheduleError ? <p className="text-sm text-destructive">{rescheduleError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setRescheduling(null)}>
                Cancel
              </Button>
              <Button onClick={submitReschedule} disabled={rescheduleSubmitting}>
                {rescheduleSubmitting ? "Saving…" : "Reschedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
