import { createFileRoute } from "@tanstack/react-router";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { RealModulePage } from "@/components/common/RealModulePage";

export const Route = createFileRoute("/app/clinic/billing")({
  component: () => <ClinicBillingPage />,
});

interface InvoiceApiDto {
  id: number;
  invoiceNumber: string;
  status: string;
  patient: { name: string } | null;
  grandTotal: number;
  discountTotal: number;
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
  col("patient", "Patient", "name"),
  col("date", "Date", "date"),
  col("amount", "Amount", "money"),
  col("discount", "Discount", "money", { secondary: true }),
  col("status", "Status", "badge", { options: ["Paid", "Pending", "Cancelled", "Refunded"] }),
];

function toRow(i: InvoiceApiDto): Row {
  return {
    id: String(i.id),
    code: i.invoiceNumber,
    patient: i.patient?.name ?? "",
    date: i.createdAt.slice(0, 10),
    amount: `₹ ${i.grandTotal.toLocaleString("en-IN")}`,
    discount: `₹ ${i.discountTotal.toLocaleString("en-IN")}`,
    status: STATUS_LABELS[i.status] ?? i.status,
  };
}

/** Clinic-sourced invoices, read-only — recording a payment happens on the full Billing → Invoices screen. */
function ClinicBillingPage() {
  return (
    <RealModulePage<InvoiceApiDto>
      path="clinic/billing"
      basePath="/api/billing/invoices?sourceModule=CLINIC"
      columns={COLUMNS}
      toRow={toRow}
      supportsDelete={false}
    />
  );
}
