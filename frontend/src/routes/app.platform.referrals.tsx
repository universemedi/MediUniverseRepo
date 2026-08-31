import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { OrganizationApiDto, ReferralCodeApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/referrals")({
  component: () => <ReferralsPage />,
});

function toRow(r: ReferralCodeApiDto): Row {
  return {
    id: String(r.id),
    code: r.code,
    organization: r.organizationName,
    reward: `₹ ${r.rewardAmount.toLocaleString("en-IN")}`,
    signups: r.signupCount,
    status: r.enabled ? "Enabled" : "Disabled",
  };
}

function ReferralsPage() {
  const [orgs, setOrgs] = useState<OrganizationApiDto[]>([]);

  useEffect(() => {
    apiFetch<OrganizationApiDto[]>("/api/platform/organizations")
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  const orgIdByName = useMemo(() => new Map(orgs.map((o) => [o.name, o.id])), [orgs]);

  const columns = useMemo(
    () => [
      col("code", "Referral Code", "code", { required: true }),
      col("organization", "Referred By", "badge", {
        required: true,
        fieldType: "select",
        options: orgs.map((o) => o.name),
      }),
      col("reward", "Reward", "money", { required: true }),
      col("signups", "Signups", "number", { formHidden: true }),
      col("status", "Status", "badge", { options: ["Enabled", "Disabled"] }),
    ],
    [orgs],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      code: values["code"],
      organizationId: orgIdByName.get(values["organization"] ?? ""),
      rewardAmount: Number((values["reward"] ?? "0").replace(/[^\d.]/g, "")),
    };
  }

  function toUpdateBody(values: Record<string, string>) {
    return {
      rewardAmount: Number((values["reward"] ?? "0").replace(/[^\d.]/g, "")),
      enabled: values["status"] === "Enabled",
    };
  }

  return (
    <RealModulePage<ReferralCodeApiDto>
      path="platform/referrals"
      basePath="/api/platform/referrals"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
    />
  );
}
