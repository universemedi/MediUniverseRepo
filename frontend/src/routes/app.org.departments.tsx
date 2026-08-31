import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/org/departments")({
  component: () => <DepartmentsPage />,
});

interface DepartmentApiDto {
  id: number;
  code: string;
  name: string;
  status: string;
}

const COLUMNS = [
  col("name", "Department", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("status", "Status", "badge", { options: ["ACTIVE", "INACTIVE"] }),
];

function toRow(d: DepartmentApiDto): Row {
  return { id: String(d.id), name: d.name, code: d.code, status: d.status };
}

function toCreateBody(values: Record<string, string>) {
  return { code: values["code"], name: values["name"] };
}

function DepartmentsPage() {
  return (
    <RealModulePage<DepartmentApiDto>
      path="org/departments"
      basePath="/api/org/departments"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
