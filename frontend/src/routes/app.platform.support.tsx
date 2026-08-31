import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { OrganizationApiDto, PlatformStaffApiDto, SupportTicketApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/support")({
  component: () => <SupportTicketsPage />,
});

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function codeFromLabel(labels: Record<string, string>, value: string) {
  return Object.entries(labels).find(([, l]) => l === value)?.[0] ?? value;
}

function toRow(t: SupportTicketApiDto): Row {
  return {
    id: String(t.id),
    code: t.code,
    subject: t.subject,
    organization: t.organizationName ?? "",
    priority: PRIORITY_LABELS[t.priority] ?? t.priority,
    owner: t.ownerName ?? "",
    createdAt: t.createdAt.slice(0, 10),
    status: STATUS_LABELS[t.status] ?? t.status,
  };
}

function SupportTicketsPage() {
  const [orgs, setOrgs] = useState<OrganizationApiDto[]>([]);
  const [staff, setStaff] = useState<PlatformStaffApiDto[]>([]);

  useEffect(() => {
    apiFetch<OrganizationApiDto[]>("/api/platform/organizations")
      .then(setOrgs)
      .catch(() => setOrgs([]));
    apiFetch<PlatformStaffApiDto[]>("/api/platform/staff")
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  const orgIdByName = useMemo(() => new Map(orgs.map((o) => [o.name, o.id])), [orgs]);
  const staffIdByName = useMemo(() => new Map(staff.map((s) => [s.fullName, s.id])), [staff]);

  const columns = useMemo(
    () => [
      col("code", "Ticket", "code", { formHidden: true }),
      col("subject", "Subject", "text", { required: true }),
      col("organization", "Organization", "badge", {
        fieldType: "select",
        options: orgs.map((o) => o.name),
      }),
      col("priority", "Priority", "badge", {
        required: true,
        fieldType: "select",
        options: Object.values(PRIORITY_LABELS),
      }),
      col("owner", "Assigned To", "badge", {
        secondary: true,
        fieldType: "select",
        options: staff.map((s) => s.fullName),
      }),
      col("createdAt", "Created", "date", { formHidden: true }),
      col("status", "Status", "badge", {
        fieldType: "select",
        options: Object.values(STATUS_LABELS),
      }),
    ],
    [orgs, staff],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      subject: values["subject"],
      organizationId: orgIdByName.get(values["organization"] ?? "") ?? null,
      priority: codeFromLabel(PRIORITY_LABELS, values["priority"] ?? ""),
      ownerId: staffIdByName.get(values["owner"] ?? "") ?? null,
    };
  }

  function toUpdateBody(values: Record<string, string>) {
    return {
      priority: codeFromLabel(PRIORITY_LABELS, values["priority"] ?? ""),
      ownerId: staffIdByName.get(values["owner"] ?? "") ?? null,
      status: codeFromLabel(STATUS_LABELS, values["status"] ?? ""),
    };
  }

  return (
    <RealModulePage<SupportTicketApiDto>
      path="platform/support"
      basePath="/api/platform/support"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      supportsDelete={false}
    />
  );
}
