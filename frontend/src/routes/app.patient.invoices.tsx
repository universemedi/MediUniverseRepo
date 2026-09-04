import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import { apiFetch, ApiError } from "@/lib/api";
import { RealModulePage } from "@/components/common/RealModulePage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/patient/invoices")({
  component: () => <MyInvoicesPage />,
});

interface InvoiceApiDto {
  id: number;
  invoiceNumber: string;
  status: string;
  grandTotal: number;
  balanceDue: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Pending",
  PARTIALLY_PAID: "Pending",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const PAYABLE = new Set(["UNPAID", "PARTIALLY_PAID"]);

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
    balanceDue: i.balanceDue,
  };
}

interface GatewayOrder {
  invoiceId: number;
  gateway: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  publicKey: string;
  mock: boolean;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Couldn't load the payment widget. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

function PayOnlineDialog({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payOnline() {
    setError(null);
    setPaying(true);
    try {
      const order = await apiFetch<GatewayOrder>(`/api/patient/invoices/${row.id}/gateway/order`, {
        method: "POST",
        data: {},
      });

      const confirm = async (
        gatewayOrderId: string,
        gatewayPaymentId: string,
        signature: string,
      ) => {
        try {
          await apiFetch(`/api/patient/invoices/${row.id}/gateway/confirm`, {
            method: "POST",
            data: { gateway: order.gateway, gatewayOrderId, gatewayPaymentId, signature },
          });
          toast.success("Payment received", { description: "Verified with the payment gateway." });
          onDone();
        } catch (err) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Payment succeeded but couldn't be confirmed — contact support.",
          );
        } finally {
          setPaying(false);
        }
      };

      // Mock mode (razorpay.mock=true, the local-dev default): the backend already synthesized a
      // pre-verified order, so there's no real checkout widget to open — confirm it directly.
      if (order.mock) {
        await confirm(order.gatewayOrderId, "mock_payment_" + Date.now(), "mock_signature");
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Payment widget failed to load.");

      const checkout = new window.Razorpay({
        key: order.publicKey,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "MediUnivers",
        description: row["code"],
        order_id: order.gatewayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await confirm(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          );
        },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: "#0f172a" },
      });
      checkout.open();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't start the online payment.",
      );
      setPaying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay {row["code"]}</DialogTitle>
          <DialogDescription>
            ₹ {Number(row["balanceDue"]).toLocaleString("en-IN")} outstanding.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={paying} onClick={payOnline}>
          {paying ? "Opening checkout…" : "Pay online"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function MyInvoicesPage() {
  const [paying, setPaying] = useState<Row | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  return (
    <>
      <RealModulePage<InvoiceApiDto>
        key={reloadTick}
        path="patient/invoices"
        basePath="/api/patient/invoices"
        columns={COLUMNS}
        toRow={toRow}
        supportsDelete={false}
        rowActions={(row) =>
          PAYABLE.has(
            Object.keys(STATUS_LABELS).find((k) => STATUS_LABELS[k] === row["status"]) ??
              String(row["status"]),
          )
            ? [
                {
                  label: "Pay online",
                  icon: <CreditCard className="h-4 w-4" />,
                  onClick: () => setPaying(row),
                },
              ]
            : []
        }
      />
      {paying ? (
        <PayOnlineDialog
          row={paying}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            setReloadTick((t) => t + 1);
          }}
        />
      ) : null}
    </>
  );
}
