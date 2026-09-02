import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/org/tax-rules")({
  component: () => <TaxRulesPage />,
});

interface TaxRuleApiDto {
  id: number;
  code: string;
  name: string;
  percentage: number;
  active: boolean;
  platformDefault: boolean;
}

const COLUMNS = [
  col("name", "Tax rule", "text", { required: true }),
  col("code", "Code", "code", { required: true }),
  col("percentage", "Rate (%)", "percent", { required: true }),
  col("status", "Status", "badge", { options: ["ACTIVE", "INACTIVE"] }),
  col("source", "Source", "badge", {
    options: ["Platform default", "Your organization"],
    formHidden: true,
  }),
];

function toRow(t: TaxRuleApiDto): Row {
  return {
    id: String(t.id),
    name: t.name,
    code: t.code,
    percentage: t.percentage,
    status: t.active ? "ACTIVE" : "INACTIVE",
    source: t.platformDefault ? "Platform default" : "Your organization",
  };
}

function toCreateBody(values: Record<string, string>) {
  return {
    code: values["code"],
    name: values["name"],
    percentage: Number(values["percentage"]) || 0,
  };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    name: values["name"],
    percentage: Number(values["percentage"]) || 0,
    active: values["status"] !== "INACTIVE",
  };
}

function TaxRulesPage() {
  return (
    <RealModulePage<TaxRuleApiDto>
      path="org/tax-rules"
      basePath="/api/org/tax-rules"
      columns={COLUMNS}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      isRowLocked={(row) => row["source"] === "Platform default"}
    />
  );
}
