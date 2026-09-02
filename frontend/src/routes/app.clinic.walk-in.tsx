import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppointmentBoard, type AppointmentApiDto } from "@/components/common/AppointmentBoard";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/clinic/walk-in")({
  component: () => <WalkInPage />,
});

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

function WalkInDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    apiFetch<Patient[]>("/api/clinic/patients")
      .then(setPatients)
      .catch(() => setPatients([]));
    apiFetch<Doctor[]>("/api/clinic/doctors")
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, [open]);

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (!patientId) errors.patientId = "Select a patient.";
    if (!doctorId) errors.doctorId = "Select a doctor.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!validateFields()) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/clinic/appointments/walk-in", {
        method: "POST",
        data: {
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          reason: reason.trim() || null,
        },
      });
      toast.success("Walk-in registered");
      setOpen(false);
      setPatientId("");
      setDoctorId("");
      setReason("");
      setFieldErrors({});
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't register this walk-in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Walk-In
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register a walk-in</DialogTitle>
          <DialogDescription>
            Assigns a token and checks the patient straight into the queue.
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
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.firstName} {p.lastName ?? ""} — {p.patientNumber}
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
              <SelectContent>
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
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Fever, follow-up..."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={submitting} onClick={submit}>
            {submitting ? "Registering…" : "Register walk-in"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WalkInPage() {
  return (
    <AppointmentBoard
      path="clinic/walk-in"
      filter={(a: AppointmentApiDto) => a.type === "WALK_IN"}
      emptyMessage="No walk-ins registered today yet."
      toolbar={(reload) => <WalkInDialog onDone={reload} />}
    />
  );
}
