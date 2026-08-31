import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/patient/reports")({
  component: () => <MyReportsPage />,
});

interface LabResultApiDto {
  flag: string;
  status: string;
}

interface LabOrderItemApiDto {
  testName: string;
  result: LabResultApiDto | null;
}

interface LabOrderApiDto {
  id: number;
  orderNumber: string;
  status: string;
  items: LabOrderItemApiDto[];
  createdAt: string;
}

const FLAG_LABELS: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  CRITICAL: "Critical",
  UNKNOWN: "Pending",
};

const COLUMNS = [
  col("code", "Report", "code"),
  col("tests", "Tests", "text"),
  col("releasedAt", "Released", "date"),
  col("flag", "Flag", "badge", { options: Object.values(FLAG_LABELS) }),
  col("status", "Status", "badge", { options: ["Released"] }),
];

function summaryFlag(items: LabOrderItemApiDto[]): string {
  const flags = items.map((i) => i.result?.flag).filter((f): f is string => !!f);
  if (flags.includes("CRITICAL")) return "Critical";
  if (flags.includes("HIGH")) return "High";
  if (flags.includes("LOW")) return "Low";
  if (flags.length === 0) return "Pending";
  return "Normal";
}

function toRow(o: LabOrderApiDto): Row {
  return {
    id: String(o.id),
    code: o.orderNumber,
    tests: o.items.map((i) => i.testName).join(", "),
    releasedAt: o.createdAt.slice(0, 10),
    flag: summaryFlag(o.items),
    status: "Released",
  };
}

/** Only released (verified) reports are shown to the patient. */
function MyReportsPage() {
  return (
    <RealModulePage<LabOrderApiDto>
      path="patient/reports"
      basePath="/api/patient/reports"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
