import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/crm/leads")({
  component: () => <LeadsPage />,
});

interface CrmLeadApiDto {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  sourceId: number | null;
  sourceName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  value: number;
  status: string;
}

interface SourceOption {
  id: number;
  name: string;
}

interface OwnerOption {
  id: number;
  fullName: string;
}

const STATUS_LABELS: Record<string, string> = {
  NEW_LEAD: "New",
  CONTACTED: "Contacted",
  DEMO_SCHEDULED: "Demo Scheduled",
  DEMO_COMPLETED: "Demo Completed",
  WON: "Won",
  LOST: "Lost",
};

function codeFromLabel(labels: Record<string, string>, value: string) {
  return Object.entries(labels).find(([, l]) => l === value)?.[0] ?? value;
}

function toRow(l: CrmLeadApiDto): Row {
  return {
    id: String(l.id),
    name: l.name,
    phone: l.phone,
    email: l.email ?? "",
    source: l.sourceName ?? "",
    owner: l.ownerName ?? "",
    value: `₹ ${l.value.toLocaleString("en-IN")}`,
    status: STATUS_LABELS[l.status] ?? l.status,
  };
}

function LeadsPage() {
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  useEffect(() => {
    apiFetch<SourceOption[]>("/api/crm/sources")
      .then(setSources)
      .catch(() => setSources([]));
    apiFetch<OwnerOption[]>("/api/org/users")
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  const sourceIdByName = useMemo(() => new Map(sources.map((s) => [s.name, s.id])), [sources]);
  const ownerIdByName = useMemo(() => new Map(owners.map((o) => [o.fullName, o.id])), [owners]);

  const columns = useMemo(
    () => [
      col("name", "Lead", "name", { required: true }),
      col("phone", "Phone", "phone", { required: true }),
      col("email", "Email", "email", { secondary: true }),
      col("source", "Source", "badge", {
        fieldType: "select",
        options: sources.map((s) => s.name),
      }),
      col("owner", "Assigned To", "badge", {
        secondary: true,
        fieldType: "select",
        options: owners.map((o) => o.fullName),
      }),
      col("value", "Value", "money", { secondary: true }),
      col("status", "Status", "badge", {
        fieldType: "select",
        options: Object.values(STATUS_LABELS),
      }),
    ],
    [sources, owners],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      name: values["name"],
      phone: values["phone"],
      email: values["email"] || null,
      sourceId: sourceIdByName.get(values["source"] ?? "") ?? null,
      ownerId: ownerIdByName.get(values["owner"] ?? "") ?? null,
      value: Number((values["value"] ?? "0").replace(/[^\d.]/g, "")) || 0,
    };
  }

  function toUpdateBody(values: Record<string, string>) {
    return {
      sourceId: sourceIdByName.get(values["source"] ?? "") ?? null,
      ownerId: ownerIdByName.get(values["owner"] ?? "") ?? null,
      value: Number((values["value"] ?? "0").replace(/[^\d.]/g, "")) || 0,
      status: codeFromLabel(STATUS_LABELS, values["status"] ?? "New"),
    };
  }

  return (
    <RealModulePage<CrmLeadApiDto>
      path="crm/leads"
      basePath="/api/crm/leads"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      supportsDelete={false}
    />
  );
}
