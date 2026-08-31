import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/cms/templates")({
  component: () => <TemplatesPage />,
});

interface WebsiteTemplateApiDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
}

const COLUMNS = [
  col("name", "Template", "text"),
  col("code", "Code", "code"),
  col("description", "Description", "text", { secondary: true }),
  col("status", "Status", "badge", { options: ["Available"] }),
];

function toRow(t: WebsiteTemplateApiDto): Row {
  return {
    id: String(t.id),
    name: t.name,
    code: t.code,
    description: t.description ?? "",
    status: "Available",
  };
}

/** Curated by MediUnivers — browse only; apply a template from Branding, and create/edit lives in the platform admin console. */
function TemplatesPage() {
  return (
    <RealModulePage<WebsiteTemplateApiDto>
      path="cms/templates"
      basePath="/api/public/website-templates?audience=ORGANIZATION"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
