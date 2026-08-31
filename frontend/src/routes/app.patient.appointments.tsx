import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

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
  return (
    <RealModulePage<AppointmentApiDto>
      path="patient/appointments"
      basePath="/api/patient/appointments"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
