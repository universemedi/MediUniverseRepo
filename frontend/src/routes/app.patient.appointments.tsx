import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch, ApiError } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";
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

export const Route = createFileRoute("/app/patient/appointments")({
  component: () => <MyAppointmentsPage />,
});

interface AppointmentApiDto {
  id: number;
  appointmentNumber: string;
  status: string;
  appointmentDate: string;
  scheduledAt: string | null;
  doctor: { fullName: string };
}

const STATUS_LABELS: Record<string, string> = {
  BOOKED: "Scheduled",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const CANCELLABLE = new Set(["BOOKED", "NO_SHOW"]);

const COLUMNS = [
  col("code", "Appointment", "code"),
  col("doctor", "Doctor", "name"),
  col("date", "Date", "date"),
  col("time", "Time", "text", { secondary: true }),
  col("status", "Status", "badge", { options: Object.values(STATUS_LABELS) }),
];

function toRow(a: AppointmentApiDto): Row {
  return {
    id: String(a.id),
    code: a.appointmentNumber,
    doctor: `Dr. ${a.doctor.fullName}`,
    date: a.appointmentDate,
    time: a.scheduledAt
      ? new Date(a.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "",
    status: STATUS_LABELS[a.status] ?? a.status,
  };
}

function MyAppointmentsPage() {
  const [cancelling, setCancelling] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  async function confirmCancel() {
    if (!cancelling) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/patient/appointments/${cancelling.id}/cancel`, { method: "POST" });
      toast.success(`${cancelling["code"]} cancelled`);
      setCancelling(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't cancel this appointment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <RealModulePage<AppointmentApiDto>
        key={reloadTick}
        path="patient/appointments"
        basePath="/api/patient/appointments"
        columns={COLUMNS}
        toRow={toRow}
        supportsDelete={false}
        rowActions={(row) =>
          CANCELLABLE.has(
            Object.keys(STATUS_LABELS).find((k) => STATUS_LABELS[k] === row["status"]) ??
              String(row["status"]),
          )
            ? [
                {
                  label: "Cancel",
                  icon: <XCircle className="h-4 w-4" />,
                  onClick: () => setCancelling(row),
                },
              ]
            : []
        }
      />
      <AlertDialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {cancelling?.["code"]}?</AlertDialogTitle>
            <AlertDialogDescription>
              This frees up the slot. You can book a new appointment any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={submitting} onClick={confirmCancel}>
              {submitting ? "Cancelling…" : "Cancel appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
