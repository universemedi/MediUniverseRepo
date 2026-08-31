import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/clinic/availability")({
  head: () => ({
    meta: [{ title: "Doctor Availability — MediUnivers Clinic" }],
  }),
  component: AvailabilityPage,
});

interface Doctor {
  id: number;
  fullName: string;
}

interface AvailabilitySlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

function AvailabilityPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("clinic");
  const [entries, setEntries] = useState<{ doctor: Doctor; slots: AvailabilitySlot[] }[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlatform || unavailable) return;
    apiFetch<Doctor[]>("/api/clinic/doctors")
      .then((doctors) =>
        Promise.all(
          doctors.map((d) =>
            apiFetch<AvailabilitySlot[]>(`/api/clinic/doctors/${d.id}/availability`).then(
              (slots) => ({
                doctor: d,
                slots: [...slots].sort(
                  (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
                ),
              }),
            ),
          ),
        ),
      )
      .then(setEntries)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load doctor availability."),
      );
  }, [isPlatform, unavailable]);

  if (isPlatform || unavailable) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">
          {isPlatform ? "Organization area" : "Clinic isn't part of this organization"}
        </h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Doctor Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly consulting slots per doctor — edit a doctor's schedule from their profile on the{" "}
          <Link
            to="/app/clinic/doctors"
            className="text-primary underline-offset-2 hover:underline"
          >
            Doctors
          </Link>{" "}
          page.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !entries ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No doctors added yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(({ doctor, slots }) => (
            <Card key={doctor.id} className="p-4">
              <p className="text-sm font-semibold text-foreground">Dr. {doctor.fullName}</p>
              {slots.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No weekly schedule set yet.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((s, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-primary/25 bg-primary/10 text-primary"
                    >
                      {DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek} {s.startTime.slice(0, 5)}–
                      {s.endTime.slice(0, 5)}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
