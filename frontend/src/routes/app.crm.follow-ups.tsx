import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/crm/follow-ups")({
  component: () => <FollowUpsPage />,
});

interface CrmFollowUpApiDto {
  id: number;
  leadId: number;
  leadName: string;
  type: string;
  ownerId: number | null;
  ownerName: string | null;
  dueDate: string;
  notes: string | null;
  status: string;
}

interface LeadOption {
  id: number;
  name: string;
}

interface OwnerOption {
  id: number;
  fullName: string;
}

const TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  VISIT: "Visit",
  WHATSAPP: "WhatsApp",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  DONE: "Done",
  MISSED: "Missed",
};

function codeFromLabel(labels: Record<string, string>, value: string) {
  return Object.entries(labels).find(([, l]) => l === value)?.[0] ?? value;
}

function toRow(f: CrmFollowUpApiDto): Row {
  return {
    id: String(f.id),
    lead: f.leadName,
    type: TYPE_LABELS[f.type] ?? f.type,
    owner: f.ownerName ?? "",
    dueDate: f.dueDate,
    notes: f.notes ?? "",
    status: STATUS_LABELS[f.status] ?? f.status,
  };
}

function FollowUpsPage() {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  useEffect(() => {
    apiFetch<LeadOption[]>("/api/crm/leads")
      .then(setLeads)
      .catch(() => setLeads([]));
    apiFetch<OwnerOption[]>("/api/org/users")
      .then(setOwners)
      .catch(() => setOwners([]));
  }, []);

  const leadIdByName = useMemo(() => new Map(leads.map((l) => [l.name, l.id])), [leads]);
  const ownerIdByName = useMemo(() => new Map(owners.map((o) => [o.fullName, o.id])), [owners]);

  const columns = useMemo(
    () => [
      col("lead", "Lead", "badge", {
        required: true,
        fieldType: "select",
        options: leads.map((l) => l.name),
      }),
      col("type", "Type", "badge", {
        required: true,
        fieldType: "select",
        options: Object.values(TYPE_LABELS),
      }),
      col("owner", "Assigned To", "badge", {
        secondary: true,
        fieldType: "select",
        options: owners.map((o) => o.fullName),
      }),
      col("dueDate", "Due", "date", { required: true }),
      col("notes", "Notes", "text", { secondary: true, fieldType: "textarea" }),
      col("status", "Status", "badge", {
        fieldType: "select",
        options: Object.values(STATUS_LABELS),
      }),
    ],
    [leads, owners],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      leadId: leadIdByName.get(values["lead"] ?? ""),
      type: codeFromLabel(TYPE_LABELS, values["type"] ?? "Call"),
      ownerId: ownerIdByName.get(values["owner"] ?? "") ?? null,
      dueDate: values["dueDate"],
      notes: values["notes"] || null,
    };
  }

  function toUpdateBody(values: Record<string, string>) {
    return {
      type: codeFromLabel(TYPE_LABELS, values["type"] ?? "Call"),
      ownerId: ownerIdByName.get(values["owner"] ?? "") ?? null,
      dueDate: values["dueDate"],
      notes: values["notes"] || null,
      status: codeFromLabel(STATUS_LABELS, values["status"] ?? "Pending"),
    };
  }

  return (
    <RealModulePage<CrmFollowUpApiDto>
      path="crm/follow-ups"
      basePath="/api/crm/follow-ups"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      supportsDelete={false}
    />
  );
}
