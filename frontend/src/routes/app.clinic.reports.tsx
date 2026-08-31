import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/clinic/reports")({
  component: () => <ClinicReportsPage />,
});

interface SavedReportApiDto {
  id: number;
  name: string;
  category: string;
  period: string;
  status: string;
  generatedAt: string;
}

const COLUMNS = [
  col("name", "Report", "text", { required: true }),
  col("category", "Category", "badge", {
    required: true,
    fieldType: "select",
    options: ["Revenue", "Patients", "Doctors", "Operations"],
  }),
  col("period", "Period", "badge", {
    required: true,
    fieldType: "select",
    options: ["Daily", "Weekly", "Monthly"],
  }),
  col("generatedAt", "Generated", "date", { formHidden: true }),
  col("status", "Status", "badge", { options: ["Ready", "Scheduled"] }),
];

function toRow(r: SavedReportApiDto): Row {
  return {
    id: String(r.id),
    name: r.name,
    category: r.category,
    period: r.period,
    generatedAt: r.generatedAt.slice(0, 10),
    status: r.status,
  };
}

function toCreateBody(values: Record<string, string>) {
  return {
    name: values["name"],
    category: values["category"],
    period: values["period"] ?? "Monthly",
  };
}

function ClinicReportsPage() {
  return (
    <RealModulePage<SavedReportApiDto>
      path="clinic/reports"
      basePath="/api/org/reports?group=CLINIC"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
