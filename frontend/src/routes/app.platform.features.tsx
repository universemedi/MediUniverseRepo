import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { PlatformFeatureApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/features")({
  component: () => <PlatformFeaturesPage />,
});

const MODULE_LABELS: Record<string, string> = {
  CLINIC: "Clinic",
  PHARMACY: "Pharmacy",
  LAB: "Laboratory",
  CRM: "Patient CRM",
  CMS: "Website Builder",
};

const COLUMNS = [
  col("name", "Feature", "text", { required: true }),
  col("moduleGroup", "Module", "badge", {
    required: true,
    fieldType: "select",
    options: Object.values(MODULE_LABELS),
  }),
  col("code", "Code", "code", { required: true }),
  col("featureType", "Type", "badge", {
    required: true,
    fieldType: "select",
    options: ["BOOLEAN", "LIMIT", "QUOTA"],
  }),
  col("active", "Status", "badge", { options: ["Active", "Inactive"] }),
];

function toRow(f: PlatformFeatureApiDto): Row {
  return {
    id: String(f.id),
    name: f.name,
    moduleGroup: MODULE_LABELS[f.moduleGroup] ?? f.moduleGroup,
    code: f.code,
    featureType: f.featureType,
    active: f.active ? "Active" : "Inactive",
  };
}

function moduleGroupFromLabel(value: string) {
  const entry = Object.entries(MODULE_LABELS).find(([, label]) => label === value);
  return entry ? entry[0] : value;
}

function toCreateBody(values: Record<string, string>) {
  return {
    code: values["code"],
    name: values["name"],
    moduleGroup: moduleGroupFromLabel(values["moduleGroup"] ?? ""),
    featureType: values["featureType"],
  };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    name: values["name"],
    moduleGroup: moduleGroupFromLabel(values["moduleGroup"] ?? ""),
    featureType: values["featureType"],
    active: values["active"] === "Active",
  };
}

function PlatformFeaturesPage() {
  return (
    <RealModulePage<PlatformFeatureApiDto>
      path="platform/features"
      basePath="/api/platform/features"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
    />
  );
}
