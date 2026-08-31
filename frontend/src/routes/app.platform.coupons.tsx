import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { CouponApiDto, PlanApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/coupons")({
  component: () => <CouponsPage />,
});

function toRow(c: CouponApiDto): Row {
  return {
    id: String(c.id),
    code: c.code,
    discountPercent: `${c.discountPercent}%`,
    validFrom: c.validFrom ?? "",
    validTo: c.validTo ?? "",
    planCodes: c.planCodes.join(", "),
    usageCount: c.usageCount,
    active: c.active ? "Active" : "Inactive",
  };
}

function toCreateBody(values: Record<string, string>) {
  return {
    code: values["code"],
    discountPercent: Number((values["discountPercent"] ?? "0").replace("%", "")),
    validFrom: values["validFrom"] || null,
    validTo: values["validTo"] || null,
    planCodes: (values["planCodes"] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

function toUpdateBody(values: Record<string, string>) {
  return {
    discountPercent: Number((values["discountPercent"] ?? "0").replace("%", "")),
    validFrom: values["validFrom"] || null,
    validTo: values["validTo"] || null,
    planCodes: (values["planCodes"] ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    active: values["active"] === "Active",
  };
}

function CouponsPage() {
  const [planCodes, setPlanCodes] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<PlanApiDto[]>("/api/platform/plans")
      .then((plans) => setPlanCodes(plans.map((p) => p.code)))
      .catch(() => setPlanCodes([]));
  }, []);

  const columns = useMemo(
    () => [
      col("code", "Code", "code", { required: true }),
      col("discountPercent", "Discount %", "percent", { required: true }),
      col("validFrom", "Valid From", "date"),
      col("validTo", "Valid Until", "date"),
      col("planCodes", "Applicable Plans", "badge", {
        multiple: true,
        options: planCodes,
        secondary: true,
      }),
      col("usageCount", "Redemptions", "number", { formHidden: true }),
      col("active", "Status", "badge", { options: ["Active", "Inactive"] }),
    ],
    [planCodes],
  );

  return (
    <RealModulePage<CouponApiDto>
      path="platform/coupons"
      basePath="/api/platform/coupons"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
    />
  );
}
