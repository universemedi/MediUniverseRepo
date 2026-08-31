import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { PlatformModuleApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/modules")({
  component: () => <PlatformModulesPage />,
});

const COLUMNS = [
  col("name", "Module", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("category", "Category", "badge", {
    required: true,
    fieldType: "select",
    options: ["CORE", "CLINICAL", "COMMERCE", "MARKETING"],
  }),
  col("active", "Status", "badge", { options: ["Active", "Inactive"] }),
];

function toRow(m: PlatformModuleApiDto): Row {
  return {
    id: String(m.id),
    name: m.name,
    code: m.code,
    category: m.category,
    active: m.active ? "Active" : "Inactive",
  };
}

function toCreateBody(values: Record<string, string>) {
  return { code: values["code"], name: values["name"], category: values["category"] };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    name: values["name"],
    category: values["category"],
    active: values["active"] === "Active",
  };
}

function PlatformModulesPage() {
  return (
    <RealModulePage<PlatformModuleApiDto>
      path="platform/modules"
      basePath="/api/platform/modules"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
    />
  );
}
