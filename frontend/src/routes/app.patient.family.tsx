import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/patient/family")({
  component: () => <MyFamilyPage />,
});

interface FamilyMemberApiDto {
  id: number;
  name: string;
  relation: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
}

const COLUMNS = [
  col("name", "Name", "text"),
  col("relation", "Relation", "text"),
  col("gender", "Gender", "badge", { options: ["Male", "Female"] }),
  col("dob", "Date of Birth", "date"),
];

function toRow(m: FamilyMemberApiDto): Row {
  return {
    id: String(m.id),
    name: m.name,
    relation: m.relation,
    gender: m.gender === "MALE" ? "Male" : m.gender === "FEMALE" ? "Female" : "",
    dob: m.dateOfBirth ?? "",
  };
}

/** Read-only — family members are registered by reception against the clinical patient record. */
function MyFamilyPage() {
  return (
    <RealModulePage<FamilyMemberApiDto>
      path="patient/family"
      basePath="/api/patient/family"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
