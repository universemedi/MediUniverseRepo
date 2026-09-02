import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/org/specializations")({
  component: () => <SpecializationsPage />,
});

interface SpecializationApiDto {
  id: number;
  code: string;
  name: string;
  status: string;
  platformDefault: boolean;
}

const COLUMNS = [
  col("name", "Specialization", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("status", "Status", "badge", { options: ["ACTIVE", "INACTIVE"] }),
  col("source", "Source", "badge", {
    options: ["Platform default", "Your organization"],
    formHidden: true,
  }),
];

function toRow(s: SpecializationApiDto): Row {
  return {
    id: String(s.id),
    name: s.name,
    code: s.code,
    status: s.status,
    source: s.platformDefault ? "Platform default" : "Your organization",
  };
}

function toCreateBody(values: Record<string, string>) {
  return { code: values["code"], name: values["name"] };
}

function toUpdateBody(values: Record<string, string>) {
  return { name: values["name"], status: values["status"] };
}

function SpecializationsPage() {
  return (
    <RealModulePage<SpecializationApiDto>
      path="org/specializations"
      basePath="/api/org/specializations"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      isRowLocked={(row) => row["source"] === "Platform default"}
    />
  );
}
