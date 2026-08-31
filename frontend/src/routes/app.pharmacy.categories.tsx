import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/pharmacy/categories")({
  component: () => <CategoriesPage />,
});

interface MasterItemApiDto {
  id: number;
  code: string;
  name: string;
  platformDefault: boolean;
}

const COLUMNS = [
  col("name", "Category", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("source", "Source", "badge", {
    options: ["Platform default", "Your organization"],
    formHidden: true,
  }),
];

function toRow(m: MasterItemApiDto): Row {
  return {
    id: String(m.id),
    name: m.name,
    code: m.code,
    source: m.platformDefault ? "Platform default" : "Your organization",
  };
}

function toCreateBody(values: Record<string, string>) {
  return { code: values["code"], name: values["name"] };
}

function CategoriesPage() {
  return (
    <RealModulePage<MasterItemApiDto>
      path="pharmacy/categories"
      basePath="/api/org/medicine-categories"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
