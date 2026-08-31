import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { PlatformStaffApiDto, RoleApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/roles")({
  component: () => <PlatformRolesPage />,
});

const COLUMNS = [
  col("name", "Role", "text"),
  col("code", "Code", "code"),
  col("users", "Users", "number"),
  col("permissions", "Permissions", "number"),
];

/** Roles are fixed, code-defined RBAC configuration (see DataSeeder) — real data, view only, no edit/create/delete here. */
function PlatformRolesPage() {
  const [staff, setStaff] = useState<PlatformStaffApiDto[]>([]);

  useEffect(() => {
    apiFetch<PlatformStaffApiDto[]>("/api/platform/staff")
      .then(setStaff)
      .catch(() => setStaff([]));
  }, []);

  function toRow(r: RoleApiDto): Row {
    return {
      id: String(r.id),
      name: r.name,
      code: r.code,
      users: staff.filter((s) => s.roleCode === r.code).length,
      permissions: r.actions.length,
    };
  }

  return (
    <RealModulePage<RoleApiDto>
      path="platform/roles"
      basePath="/api/public/roles?portal=PLATFORM"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
