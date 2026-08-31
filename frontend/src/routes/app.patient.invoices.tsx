import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/patient/invoices")({
  component: () => <MyInvoicesPage />,
});

interface InvoiceApiDto {
  id: number;
  invoiceNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Pending",
  PARTIALLY_PAID: "Pending",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const COLUMNS = [
  col("code", "Invoice", "code"),
  col("date", "Date", "date"),
  col("amount", "Amount", "money"),
  col("status", "Status", "badge", { options: ["Paid", "Pending", "Cancelled", "Refunded"] }),
];

function toRow(i: InvoiceApiDto): Row {
  return {
    id: String(i.id),
    code: i.invoiceNumber,
    date: i.createdAt.slice(0, 10),
    amount: `₹ ${i.grandTotal.toLocaleString("en-IN")}`,
    status: STATUS_LABELS[i.status] ?? i.status,
  };
}

function MyInvoicesPage() {
  return (
    <RealModulePage<InvoiceApiDto>
      path="patient/invoices"
      basePath="/api/patient/invoices"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
