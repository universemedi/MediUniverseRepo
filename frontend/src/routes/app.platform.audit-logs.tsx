import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { AuditLogApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/audit-logs")({
  component: () => <AuditLogsPage />,
});

const COLUMNS = [
  col("actor", "Actor", "name"),
  col("action", "Action", "badge", { options: ["CREATED", "UPDATED", "DELETED"] }),
  col("entity", "Entity", "text"),
  col("organization", "Organization", "org", { secondary: true }),
  col("createdAt", "Timestamp", "date"),
];

function toRow(l: AuditLogApiDto): Row {
  return {
    id: String(l.id),
    actor: l.actorName,
    action: l.action,
    entity: l.entityType + (l.entityId ? ` #${l.entityId}` : ""),
    organization: l.organizationName ?? "",
    createdAt: l.createdAt.slice(0, 10),
  };
}

/** Append-only — written internally whenever a privileged action happens, never through the UI. */
function AuditLogsPage() {
  return (
    <RealModulePage<AuditLogApiDto>
      path="platform/audit-logs"
      basePath="/api/platform/audit-logs"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
