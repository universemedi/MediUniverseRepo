import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Clock, MapPin, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
        content: "Choose a clinic, doctor, date and available time slot to book your consultation.",
      },
      { property: "og:title", content: "Book an Appointment Slot" },
      {
        property: "og:description",
        content: "Patient self-booking for clinics running on MediUnivers.",
      },
    ],
  }),
  component: BookSlot,
});

const CLINICS = [
  { id: "hq", name: "Sunrise Multispeciality — Head Office", city: "Mumbai" },
  { id: "andheri", name: "Sunrise Clinic — Andheri", city: "Mumbai" },
  { id: "pune", name: "Sunrise Clinic — Pune Central", city: "Pune" },
];

const DOCTORS = [
  { id: "d1", name: "Dr. Ananya Rao", dept: "General Medicine", fee: "₹ 600" },
  { id: "d2", name: "Dr. Vikram Shetty", dept: "Cardiology", fee: "₹ 900" },
  { id: "d3", name: "Dr. Meera Iyer", dept: "Dermatology", fee: "₹ 750" },
  { id: "d4", name: "Dr. Rahul Nair", dept: "Orthopaedics", fee: "₹ 850" },
];

const SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
];

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

/** deterministic "already booked" slots so the grid feels real */
function bookedSlots(doctorId: string, dateIso: string) {
  const seed = [...(doctorId + dateIso)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return SLOTS.filter((_, i) => (seed + i * 7) % 4 === 0);
}

function BookSlot() {
  const days = useMemo(() => nextDays(10), []);
  const [clinic, setClinic] = useState(CLINICS[0]!.id);
  const [doctorId, setDoctorId] = useState(DOCTORS[0]!.id);
  const [date, setDate] = useState(days[0]!.iso);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState<{ slot: string; date: string } | null>(null);

  const doctor = DOCTORS.find((d) => d.id === doctorId)!;
  const taken = useMemo(() => bookedSlots(doctorId, date), [doctorId, date]);

  const confirm = () => {
    if (!slot) {
      toast.error("Select a time slot to continue");
      return;
    }
    setConfirmed({ slot, date });
    toast.success(`Appointment booked with ${doctor.name} · ${slot}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <CalendarPlus className="h-5 w-5 text-primary" /> Book a Slot
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a clinic, doctor and an available time — confirmation is instant.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/25 bg-primary/10 text-primary">
          Patient self-booking
        </Badge>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Clinic / branch</Label>
                <Select value={clinic} onValueChange={setClinic}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLINICS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select
                  value={doctorId}
                  onValueChange={(v) => {
                    setDoctorId(v);
                    setSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCTORS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} · {d.dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      onClick={() => {
                        setDate(d.iso);
                        setSlot(null);
                      }}
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {SLOTS.map((s) => {
                  const disabled = taken.includes(s);
                  const active = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSlot(s)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                        disabled &&
                          "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground/60 line-through",
                        !disabled && active && "border-primary bg-primary text-primary-foreground",
                        !disabled &&
                          !active &&
                          "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Struck-through slots are already booked.
              </p>
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
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <span>{CLINICS.find((c) => c.id === clinic)!.name}</span>
            </li>
            <li className="flex items-start gap-2">
              <Stethoscope className="mt-0.5 h-4 w-4 text-primary" />
              <span>
                {doctor.name}
                <span className="block text-xs text-muted-foreground">
                  {doctor.dept} · Fee {doctor.fee}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CalendarPlus className="mt-0.5 h-4 w-4 text-primary" />
              <span>{new Date(date).toDateString()}</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-primary" />
              <span>{slot ?? "No slot selected"}</span>
            </li>
          </ul>

          <Button className="w-full" onClick={confirm}>
            Confirm booking
          </Button>

          {confirmed ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs text-primary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Confirmed with {doctor.name} on {new Date(confirmed.date).toDateString()} at{" "}
                {confirmed.slot}. A reminder will be sent to your registered mobile.
              </span>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
