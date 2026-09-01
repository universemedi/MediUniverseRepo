import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { PlatformStaffApiDto, RoleApiDto } from "@/lib/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/platform/users")({
  component: () => <PlatformUsersPage />,
});

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  DISABLED: "Disabled",
};

function codeFromLabel(labels: Record<string, string>, value: string) {
  return Object.entries(labels).find(([, l]) => l === value)?.[0] ?? value;
}

function toRow(u: PlatformStaffApiDto): Row {
  return {
    id: String(u.id),
    name: u.fullName,
    email: u.email,
    phone: u.phone ?? "",
    role: u.roleName,
    status: STATUS_LABELS[u.status] ?? u.status,
  };
}

function PlatformUsersPage() {
  const [roles, setRoles] = useState<RoleApiDto[]>([]);

  useEffect(() => {
    apiFetch<RoleApiDto[]>("/api/public/roles", { params: { portal: "PLATFORM" } })
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const roleCodeByName = useMemo(() => new Map(roles.map((r) => [r.name, r.code])), [roles]);

  const columns = useMemo(
    () => [
      col("name", "Name", "name", { required: true }),
      col("email", "Email", "email", { required: true }),
      col("phone", "Phone", "phone"),
      col("role", "Role", "badge", {
        required: true,
        fieldType: "select",
        options: roles.map((r) => r.name),
      }),
      col("status", "Status", "badge", {
        fieldType: "select",
        options: Object.values(STATUS_LABELS),
      }),
    ],
    [roles],
  );

  function toCreateBody(values: Record<string, string>) {
    return {
      fullName: values["name"],
      email: values["email"],
      phone: values["phone"] || null,
      roleCode: roleCodeByName.get(values["role"] ?? "") ?? values["role"],
    };
  }

  function toUpdateBody(values: Record<string, string>) {
    return {
      fullName: values["name"],
      email: values["email"],
      phone: values["phone"] || null,
      roleCode: roleCodeByName.get(values["role"] ?? "") ?? values["role"],
      status: codeFromLabel(STATUS_LABELS, values["status"] ?? ""),
    };
  }

  return (
    <RealModulePage<PlatformStaffApiDto>
      path="platform/users"
      basePath="/api/platform/staff"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      toUpdateBody={toUpdateBody}
      supportsDelete={false}
    />
  );
}
