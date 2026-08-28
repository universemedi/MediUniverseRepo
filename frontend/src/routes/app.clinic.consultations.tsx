import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Lock, Plus, ShieldAlert, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface ConsultationSearch {
  appointmentId?: number | undefined;
}

export const Route = createFileRoute("/app/clinic/consultations")({
  validateSearch: (search: Record<string, unknown>): ConsultationSearch => ({
    appointmentId:
      typeof search["appointmentId"] === "number" ? (search["appointmentId"] as number) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Consultations — MediUnivers Clinic" },
      {
        name: "description",
        content: "The doctor's consultation workspace: vitals, notes, diagnosis and prescriptions.",
      },
    ],
  }),
  component: ConsultationsPage,
});

interface Appointment {
  id: number;
  tokenNumber: string | null;
  status: string;
  patient: { id: number; name: string; patientNumber: string };
  doctor: { id: number; fullName: string };
}

interface PrescriptionRow {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_ROW: PrescriptionRow = {
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

function ConsultationsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const { appointmentId } = Route.useSearch();
  const unavailable = !isPlatform && isUnavailable("clinic");

  const [queue, setQueue] = useState<Appointment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [temp, setTemp] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [spo2, setSpo2] = useState("");
  const [items, setItems] = useState<PrescriptionRow[]>([{ ...EMPTY_ROW }]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [saving, setSaving] = useState(false);

  function loadQueue() {
    if (isPlatform || unavailable) return;
    apiFetch<Appointment[]>("/api/clinic/appointments")
      .then((all) =>
        setQueue(all.filter((a) => a.status === "CHECKED_IN" || a.status === "IN_CONSULTATION")),
      )
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load the queue."),
      );
  }

  useEffect(loadQueue, [isPlatform, unavailable]);

  useEffect(() => {
    if (appointmentId) void openConsultation(appointmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

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
    setChiefComplaint("");
    setClinicalNotes("");
    setDiagnosis("");
    setHeight("");
    setWeight("");
    setTemp("");
    setBp("");
    setPulse("");
    setSpo2("");
    setItems([{ ...EMPTY_ROW }]);
    setFollowUpDate("");
    setFollowUpNotes("");
  }

  async function openConsultation(id: number) {
    setStarting(true);
    try {
      const consultation = await apiFetch<{
        id: number;
        patient: Appointment["patient"];
        doctor: Appointment["doctor"];
      }>(`/api/clinic/consultations/start/${id}`, {
        method: "POST",
      });
      resetForm();
      setActiveAppointment({
        id,
        tokenNumber: null,
        status: "IN_CONSULTATION",
        patient: consultation.patient,
        doctor: consultation.doctor,
      });
      setConsultationId(consultation.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't start this consultation.");
    } finally {
      setStarting(false);
    }
  }

  async function complete() {
    if (!consultationId) return;
    setSaving(true);
    try {
      await apiFetch(`/api/clinic/consultations/${consultationId}/complete`, {
        method: "PUT",
        data: {
          chiefComplaint: chiefComplaint.trim() || null,
          clinicalNotes: clinicalNotes.trim() || null,
          diagnosis: diagnosis.trim() || null,
          heightCm: height ? Number(height) : null,
          weightKg: weight ? Number(weight) : null,
          temperatureF: temp ? Number(temp) : null,
          bloodPressure: bp.trim() || null,
          pulseBpm: pulse ? Number(pulse) : null,
          spo2Percent: spo2 ? Number(spo2) : null,
          prescriptionItems: items.filter((i) => i.medicineName.trim()),
          followUpDate: followUpDate || null,
          followUpNotes: followUpNotes.trim() || null,
        },
      });
      toast.success("Consultation completed", { description: "Saved to the patient's EMR." });
      setActiveAppointment(null);
      setConsultationId(null);
      loadQueue();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't complete the consultation.");
    } finally {
      setSaving(false);
    }
  }

  if (activeAppointment) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {activeAppointment.patient.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeAppointment.patient.patientNumber} · Dr. {activeAppointment.doctor.fullName}
            </p>
          </div>
          <Button variant="outline" onClick={() => setActiveAppointment(null)}>
            Back to queue
          </Button>
        </div>

        <Card className="space-y-4 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vitals
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Temperature (°F)</Label>
              <Input type="number" value={temp} onChange={(e) => setTemp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Blood pressure</Label>
              <Input placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pulse (bpm)</Label>
              <Input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SpO2 (%)</Label>
              <Input type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical notes
          </p>
          <div className="space-y-1.5">
            <Label>Chief complaint</Label>
            <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Clinical notes</Label>
            <Textarea
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnosis</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Prescription
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ROW }])}
            >
              <Plus className="h-3.5 w-3.5" /> Add medicine
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-5"
              >
                <Input
                  placeholder="Medicine"
                  value={item.medicineName}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) =>
                        i === idx ? { ...it, medicineName: e.target.value } : it,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="Dosage"
                  value={item.dosage}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, dosage: e.target.value } : it)),
                    )
                  }
                />
                <Input
                  placeholder="Frequency"
                  value={item.frequency}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, frequency: e.target.value } : it)),
                    )
                  }
                />
                <Input
                  placeholder="Duration"
                  value={item.duration}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, duration: e.target.value } : it)),
                    )
                  }
                />
                <div className="flex gap-1">
                  <Input
                    placeholder="Instructions"
                    value={item.instructions}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, instructions: e.target.value } : it,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Follow-up
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Follow-up date</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setActiveAppointment(null)}>
            Save for later
          </Button>
          <Button onClick={complete} disabled={saving}>
            {saving ? "Completing…" : "Complete consultation"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consultations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Patients checked in and waiting, across all doctors.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !queue ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-6 w-6" />
          No one is waiting right now — checked-in patients from Appointments & Queue show up here.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {queue.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
                {a.tokenNumber ?? "—"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.patient.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.patient.patientNumber} · Dr. {a.doctor.fullName}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  a.status === "IN_CONSULTATION"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : ""
                }
              >
                {a.status.replace("_", " ")}
              </Badge>
              <Button size="sm" disabled={starting} onClick={() => openConsultation(a.id)}>
                <Stethoscope className="h-3.5 w-3.5" />{" "}
                {a.status === "IN_CONSULTATION" ? "Resume" : "Start"}
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
