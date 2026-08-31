import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/pharmacy/batches")({
  component: () => <BatchesPage />,
});

interface OrgBatchApiDto {
  id: number;
  batchNumber: string;
  medicineName: string;
  branchName: string;
  expiryDate: string;
  mrp: number;
  quantityAvailable: number;
  expired: boolean;
}

function daysLeft(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const COLUMNS = [
  col("batch", "Batch", "code"),
  col("medicine", "Medicine", "text"),
  col("branch", "Branch", "org", { secondary: true }),
  col("quantity", "Quantity", "number"),
  col("mrp", "MRP", "money", { secondary: true }),
  col("expiry", "Expiry", "date"),
  col("status", "Status", "badge", { options: ["Good", "Near Expiry", "Expired"] }),
];

function toRow(b: OrgBatchApiDto): Row {
  const left = daysLeft(b.expiryDate);
  const status = b.expired ? "Expired" : left <= 30 ? "Near Expiry" : "Good";
  return {
    id: String(b.id),
    batch: b.batchNumber,
    medicine: b.medicineName,
    branch: b.branchName,
    quantity: b.quantityAvailable,
    mrp: `₹ ${b.mrp.toLocaleString("en-IN")}`,
    expiry: b.expiryDate,
    status,
  };
}

/** Read-only — new batches are received through Purchases → Goods Receipt, not created here. */
function BatchesPage() {
  return (
    <RealModulePage<OrgBatchApiDto>
      path="pharmacy/batches"
      basePath="/api/pharmacy/batches"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
