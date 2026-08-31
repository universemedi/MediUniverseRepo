import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/crm/activities")({
  component: () => <ActivitiesPage />,
});

interface CrmActivityApiDto {
  id: number;
  leadName: string;
  activityType: string;
  ownerName: string | null;
  notes: string | null;
  createdAt: string;
}

interface LeadOption {
  id: number;
  name: string;
}

const TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  STATUS_CHANGE: "Status Change",
};

function codeFromLabel(labels: Record<string, string>, value: string) {
  return Object.entries(labels).find(([, l]) => l === value)?.[0] ?? value;
}

function toRow(a: CrmActivityApiDto): Row {
  return {
    id: String(a.id),
    lead: a.leadName,
    activity: TYPE_LABELS[a.activityType] ?? a.activityType,
    owner: a.ownerName ?? "",
    createdAt: a.createdAt.slice(0, 10),
    notes: a.notes ?? "",
  };
}

/** Append-only timeline — no edit/delete once logged. */
function ActivitiesPage() {
  const [leads, setLeads] = useState<LeadOption[]>([]);

  useEffect(() => {
    apiFetch<LeadOption[]>("/api/crm/leads")
      .then(setLeads)
      .catch(() => setLeads([]));
  }, []);

  const leadIdByName = useMemo(() => new Map(leads.map((l) => [l.name, l.id])), [leads]);

  const columns = useMemo(
    () => [
      col("lead", "Lead", "badge", {
        required: true,
        fieldType: "select",
        options: leads.map((l) => l.name),
      }),
      col("activity", "Activity", "badge", {
        required: true,
        fieldType: "select",
        options: Object.values(TYPE_LABELS),
      }),
      col("owner", "Owner", "name", { secondary: true, formHidden: true }),
      col("createdAt", "Logged", "date", { formHidden: true }),
      col("notes", "Notes", "text", { secondary: true, fieldType: "textarea" }),
    ],
    [leads],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      leadId: leadIdByName.get(values["lead"] ?? ""),
      activityType: codeFromLabel(TYPE_LABELS, values["activity"] ?? "Note"),
      notes: values["notes"] || null,
    };
  }

  return (
    <RealModulePage<CrmActivityApiDto>
      path="crm/activities"
      basePath="/api/crm/activities"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
