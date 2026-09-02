import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/clinic/prescriptions")({
  component: () => <PrescriptionsPage />,
});

interface PrescriptionItem {
  medicineName: string;
}

interface ConsultationApiDto {
  id: number;
  pharmacyStatus: string;
  patient: { name: string; patientNumber: string };
  doctor: { fullName: string };
  prescriptionItems: PrescriptionItem[];
  startedAt: string;
}

const PHARMACY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Issued",
  PARTIALLY_DISPENSED: "Partially Dispensed",
  DISPENSED: "Dispensed",
};

const COLUMNS = [
  col("code", "Prescription", "code"),
  col("patient", "Patient", "name"),
  col("doctor", "Doctor", "name"),
  col("date", "Date", "date"),
  col("items", "Items", "number"),
  col("status", "Status", "badge", { options: ["Issued", "Partially Dispensed", "Dispensed"] }),
];

function toRow(c: ConsultationApiDto): Row {
  return {
    id: String(c.id),
    code: `RX-${String(c.id).padStart(5, "0")}`,
    patient: `${c.patient.name} (${c.patient.patientNumber})`,
    doctor: `Dr. ${c.doctor.fullName}`,
    date: c.startedAt.slice(0, 10),
    items: c.prescriptionItems.length,
    status: PHARMACY_STATUS_LABELS[c.pharmacyStatus] ?? c.pharmacyStatus,
  };
}

/** Read-only from the clinic side — dispensing itself happens on the Pharmacy module's dispensing screen. */
function PrescriptionsPage() {
  return (
    <RealModulePage<ConsultationApiDto>
      path="clinic/prescriptions"
      basePath="/api/clinic/consultations/prescriptions"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
