import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { OrgTypeApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/organization-types")({
  component: () => <OrgTypesPage />,
});

const MODULE_LABELS: Record<string, string> = {
  CLINIC: "Clinic",
  PHARMACY: "Pharmacy",
  LAB: "Laboratory",
  CRM: "Patient CRM",
  CMS: "Website Builder",
};

const COLUMNS = [
  col("name", "Type Name", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("modules", "Default Modules", "badge", {
    multiple: true,
    options: Object.values(MODULE_LABELS),
    secondary: true,
  }),
  col("active", "Status", "badge", { options: ["Active", "Inactive"] }),
];

function toRow(t: OrgTypeApiDto): Row {
  return {
    id: String(t.id),
    name: t.name,
    code: t.code,
    modules: t.modules.map((m) => MODULE_LABELS[m] ?? m).join(", "),
    active: t.active ? "Active" : "Inactive",
  };
}

function moduleCodesFromLabels(value: string) {
  const labels = value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return labels.map(
    (label) => Object.entries(MODULE_LABELS).find(([, l]) => l === label)?.[0] ?? label,
  );
}

function toCreateBody(values: Record<string, string>) {
  return {
    code: values["code"],
    name: values["name"],
    description: "",
    modules: moduleCodesFromLabels(values["modules"] ?? ""),
  };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    name: values["name"],
    description: "",
    modules: moduleCodesFromLabels(values["modules"] ?? ""),
    active: values["active"] === "Active",
  };
}

function OrgTypesPage() {
  return (
    <RealModulePage<OrgTypeApiDto>
      path="platform/organization-types"
      basePath="/api/platform/organization-types"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
    />
  );
}
