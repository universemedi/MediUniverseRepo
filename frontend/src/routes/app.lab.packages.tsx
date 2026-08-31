import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/lab/packages")({
  component: () => <PackagesPage />,
});

interface LabTestApiDto {
  id: number;
  name: string;
}

interface LabPackageApiDto {
  id: number;
  name: string;
  price: number;
  discountPercent: number;
  testNames: string[];
  status: string;
}

function toRow(p: LabPackageApiDto): Row {
  return {
    id: String(p.id),
    name: p.name,
    tests: p.testNames.join(", "),
    price: `₹ ${p.price.toLocaleString("en-IN")}`,
    discount: `${p.discountPercent}%`,
    status: p.status,
  };
}

function PackagesPage() {
  const [tests, setTests] = useState<LabTestApiDto[]>([]);

  useEffect(() => {
    apiFetch<LabTestApiDto[]>("/api/lab/tests")
      .then(setTests)
      .catch(() => setTests([]));
  }, []);

  const testIdByName = useMemo(() => new Map(tests.map((t) => [t.name, t.id])), [tests]);

  const columns = useMemo(
    () => [
      col("name", "Package", "text", { required: true }),
      col("tests", "Included Tests", "badge", {
        multiple: true,
        options: tests.map((t) => t.name),
        required: true,
      }),
      col("price", "Price", "money", { required: true }),
      col("discount", "Discount %", "percent", { secondary: true }),
      col("status", "Status", "badge", { options: ["ACTIVE", "INACTIVE"], formHidden: true }),
    ],
    [tests],
  );

  function toCreateBody(values: Record<string, string>) {
    const testIds = (values["tests"] ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => testIdByName.get(n))
      .filter((id): id is number => id !== undefined);
    return {
      name: values["name"],
      price: Number((values["price"] ?? "0").replace(/[^\d.]/g, "")),
      discountPercent: Number(values["discount"] ?? "0"),
      testIds,
    };
  }

  return (
    <RealModulePage<LabPackageApiDto>
      path="lab/packages"
      basePath="/api/lab/packages"
      columns={columns}
      toRow={toRow}
      toCreateBody={toCreateBody}
      supportsDelete={false}
    />
  );
}
