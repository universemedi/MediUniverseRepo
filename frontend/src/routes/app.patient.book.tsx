import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Clock, Stethoscope } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/patient/book")({
  head: () => ({
    meta: [
      { title: "Book an Appointment Slot — MediUnivers Patient Portal" },
      {
        name: "description",
        content: "Choose a doctor, date and available time slot to book your consultation.",
      },
    ],
  }),
  component: BookSlot,
});

interface Doctor {
  id: number;
  fullName: string;
  specializations: string[];
  consultationFee: number | null;
}

interface Slot {
  time: string;
  available: boolean;
}

function nextDays(count: number) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.getDate(),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
    };
  });
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

function BookSlot() {
  const days = useMemo(() => nextDays(14), []);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState(days[0]!.iso);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ slot: string; date: string } | null>(null);

  useEffect(() => {
    apiFetch<Doctor[]>("/api/patient/doctors")
      .then((list) => {
        setDoctors(list);
        if (list.length > 0) setDoctorId(String(list[0]!.id));
      })
      .catch((err) =>
        setDoctorsError(err instanceof ApiError ? err.message : "Couldn't load doctors."),
      );
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    setSlot(null);
    setSlots(null);
    apiFetch<Slot[]>(`/api/patient/doctors/${doctorId}/slots`, { params: { date } })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [doctorId, date]);

  const doctor = doctors?.find((d) => String(d.id) === doctorId) ?? null;

  async function confirm() {
    if (!slot || !doctor) {
      toast.error("Select a time slot to continue");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/patient/appointments", {
        method: "POST",
        data: {
          doctorId: doctor.id,
          appointmentDate: date,
          time: slot,
          reason: reason.trim() || null,
        },
      });
      setConfirmed({ slot: formatTime(slot), date });
      toast.success(`Appointment booked with Dr. ${doctor.fullName} · ${formatTime(slot)}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't book this appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <CalendarPlus className="h-5 w-5 text-primary" /> Book a Slot
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a doctor and an available time — confirmation is instant.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/25 bg-primary/10 text-primary">
          Patient self-booking
        </Badge>
      </div>

      {doctorsError ? (
        <p className="text-sm text-destructive">{doctorsError}</p>
      ) : !doctors ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : doctors.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No doctors available yet.
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            <Card className="space-y-4 p-5">
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        Dr. {d.fullName}
                        {d.specializations.length ? ` · ${d.specializations.join(", ")}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Choose a date</Label>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const active = d.iso === date;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setDate(d.iso)}
                        className={cn(
                          "flex min-w-16 shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        <span>{d.day}</span>
                        <span className="text-base font-semibold">{d.date}</span>
                        <span>{d.month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Available slots
                </Label>
                {!slots ? (
                  <Skeleton className="h-24 rounded-lg" />
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This doctor has no availability set for this day of the week.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {slots.map((s) => {
                        const disabled = !s.available;
                        const active = slot === s.time;
                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSlot(s.time)}
                            className={cn(
                              "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                              disabled &&
                                "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground/60 line-through",
                              !disabled &&
                                active &&
                                "border-primary bg-primary text-primary-foreground",
                              !disabled &&
                                !active &&
                                "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
                            )}
                          >
                            {formatTime(s.time)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Struck-through slots are already booked.
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason for visit (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your symptoms briefly…"
                  rows={3}
                />
              </div>
            </Card>
          </div>

          <Card className="h-fit space-y-4 p-5 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Booking summary
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Stethoscope className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  {doctor ? `Dr. ${doctor.fullName}` : "No doctor selected"}
                  {doctor?.consultationFee != null ? (
                    <span className="block text-xs text-muted-foreground">
                      Fee ₹{doctor.consultationFee.toLocaleString("en-IN")}
                    </span>
                  ) : null}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CalendarPlus className="mt-0.5 h-4 w-4 text-primary" />
                <span>{new Date(date).toDateString()}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <span>{slot ? formatTime(slot) : "No slot selected"}</span>
              </li>
            </ul>

            <Button className="w-full" onClick={confirm} disabled={submitting}>
              {submitting ? "Booking…" : "Confirm booking"}
            </Button>

            {confirmed ? (
              <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Confirmed with {doctor ? `Dr. ${doctor.fullName}` : ""} on{" "}
                  {new Date(confirmed.date).toDateString()} at {confirmed.slot}.
                </span>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
