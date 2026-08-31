import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/crm/sources")({
  component: () => <SourcesPage />,
});

interface CrmLeadSourceApiDto {
  id: number;
  code: string;
  name: string;
  status: string;
}

const COLUMNS = [
  col("name", "Source", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("status", "Status", "badge", { options: ["ACTIVE", "INACTIVE"], formHidden: true }),
];

function toRow(s: CrmLeadSourceApiDto): Row {
  return { id: String(s.id), name: s.name, code: s.code, status: s.status };
}

function toCreateBody(values: Record<string, string>) {
  return { code: values["code"], name: values["name"] };
}

function SourcesPage() {
  return (
    <RealModulePage<CrmLeadSourceApiDto>
      path="crm/sources"
      basePath="/api/crm/sources"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
