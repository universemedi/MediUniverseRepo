import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/patient/prescriptions")({
  component: () => <MyPrescriptionsPage />,
});

interface ConsultationApiDto {
  id: number;
  pharmacyStatus: string;
  prescriptionItems: { medicineName: string }[];
  doctor: { fullName: string };
  startedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  NONE: "No Prescription",
  PENDING: "Issued",
  PARTIALLY_DISPENSED: "Partially Dispensed",
  DISPENSED: "Dispensed",
};

const COLUMNS = [
  col("code", "Prescription", "code"),
  col("doctor", "Doctor", "name"),
  col("date", "Date", "date"),
  col("items", "Items", "number"),
  col("status", "Status", "badge", { options: Object.values(STATUS_LABELS) }),
];

function toRow(c: ConsultationApiDto): Row {
  return {
    id: String(c.id),
    code: `RX-${String(c.id).padStart(5, "0")}`,
    doctor: `Dr. ${c.doctor.fullName}`,
    date: c.startedAt.slice(0, 10),
    items: c.prescriptionItems.length,
    status: STATUS_LABELS[c.pharmacyStatus] ?? c.pharmacyStatus,
  };
}

function MyPrescriptionsPage() {
  return (
    <RealModulePage<ConsultationApiDto>
      path="patient/prescriptions"
      basePath="/api/patient/prescriptions"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
