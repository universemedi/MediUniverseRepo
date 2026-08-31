import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Banknote, CheckCircle2, CreditCard, Receipt, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/billing/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — MediUnivers Billing" },
      {
        name: "description",
        content:
          "Every invoice generated across Clinic, Pharmacy and Laboratory, and payment collection.",
      },
    ],
  }),
  component: InvoicesPage,
});

interface LineItem {
  id: number;
  description: string;
  sourceType: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  lineTotal: number;
}

interface Payment {
  id: number;
  paymentNumber: string;
  amount: number;
  mode: string;
  reference: string | null;
  refund: boolean;
  receivedByName: string | null;
  receivedAt: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  sourceModule: string;
  status: string;
  patient: { name: string; patientNumber: string } | null;
  lineItems: LineItem[];
  payments: Payment[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  UNPAID: "border-amber-300 bg-amber-50 text-amber-700",
  PARTIALLY_PAID: "border-amber-300 bg-amber-50 text-amber-700",
  PAID: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
  REFUNDED: "border-destructive/25 bg-destructive/10 text-destructive",
};

const MODULE_STYLE: Record<string, string> = {
  CLINIC: "border-primary/25 bg-primary/10 text-primary",
  PHARMACY: "text-muted-foreground",
  LAB: "text-muted-foreground",
  OTHER: "text-muted-foreground",
};

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

/** Loads Razorpay's checkout widget script once, reusing the same promise across calls. */
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

function InvoicesPage() {
  const { isPlatform } = usePermissions();

  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<Invoice | null>(null);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("CASH");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  function load() {
    if (isPlatform) return;
    const params = statusFilter === "ALL" ? {} : { status: statusFilter };
    apiFetch<Invoice[]>("/api/billing/invoices", {
      method: "GET",
      params,
    })
      .then(setInvoices)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load invoices."),
      );
  }

  useEffect(load, [isPlatform, statusFilter]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invoices belong to a subscribed organization's own billing.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  function openInvoice(inv: Invoice) {
    setActive(inv);
    setAmount(inv.balanceDue > 0 ? String(inv.balanceDue) : "");
    setMode("CASH");
    setReference("");
    setPayError(null);
  }

  async function submitPayment() {
    if (!active) return;
    if (!amount || Number(amount) <= 0) return setPayError("Enter an amount greater than zero.");
    if (Number(amount) > active.balanceDue)
      return setPayError(`That's more than the outstanding balance of ₹${active.balanceDue}.`);

    setPayError(null);
    setSubmitting(true);
    try {
      const updated = await apiFetch<Invoice>(`/api/billing/invoices/${active.id}/payments`, {
        method: "POST",
        data: {
          amount: Number(amount),
          mode,
          reference: reference.trim() || null,
        },
      });

      toast.success("Payment recorded", {
        description: updated.status === "PAID" ? "Invoice fully paid." : "Partial payment saved.",
      });
      setActive(updated);
      setAmount(updated.balanceDue > 0 ? String(updated.balanceDue) : "");
      load();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Couldn't record this payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function payOnline() {
    if (!active) return;
    setPayError(null);
    setPaying(true);
    try {
      const order = await apiFetch<GatewayOrder>(
        `/api/billing/invoices/${active.id}/gateway/order`,
        {
          method: "POST",
          data: {},
        },
      );

      const confirm = async (
        gatewayOrderId: string,
        gatewayPaymentId: string,
        signature: string,
      ) => {
        try {
          const updated = await apiFetch<Invoice>(
            `/api/billing/invoices/${active.id}/gateway/confirm`,
            {
              method: "POST",
              data: { gateway: order.gateway, gatewayOrderId, gatewayPaymentId, signature },
            },
          );

          toast.success("Payment received", {
            description: "Verified with the payment gateway.",
          });
          setActive(updated);
          load();
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
        description: active.invoiceNumber,
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
      setPayError(
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every charge from Clinic, Pharmacy and Laboratory lands here — one billing engine for
            the whole organization.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !invoices ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Receipt className="mx-auto mb-2 h-6 w-6" /> No invoices yet — they're generated
          automatically from Clinic consultations, Pharmacy sales and Laboratory orders.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => openInvoice(inv)}
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {inv.invoiceNumber} {inv.patient ? `· ${inv.patient.name}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {inv.lineItems.length} item(s) · {new Date(inv.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className={MODULE_STYLE[inv.sourceModule] ?? ""}>
                {inv.sourceModule}
              </Badge>
              <Badge variant="outline" className={STATUS_STYLE[inv.status] ?? ""}>
                {inv.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="font-medium">
                ₹{inv.grandTotal}
              </Badge>
            </button>
          ))}
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active.invoiceNumber}
                  <Badge variant="outline" className={STATUS_STYLE[active.status] ?? ""}>
                    {active.status.replace("_", " ")}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {active.sourceModule}{" "}
                  {active.patient
                    ? `· ${active.patient.name} (${active.patient.patientNumber})`
                    : "· No patient on file"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                {active.lineItems.map((li) => (
                  <div key={li.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {li.description} × {li.quantity}
                    </span>
                    <span>₹{li.lineTotal}</span>
                  </div>
                ))}
                <div className="mt-2 space-y-1 border-t pt-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{active.subtotal}</span>
                  </div>
                  {active.discountTotal > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Discount</span>
                      <span>-₹{active.discountTotal}</span>
                    </div>
                  ) : null}
                  {active.taxTotal > 0 ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>₹{active.taxTotal}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{active.grandTotal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Paid</span>
                    <span>₹{active.amountPaid}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Balance due</span>
                    <span>₹{active.balanceDue}</span>
                  </div>
                </div>
              </div>

              {active.payments.length ? (
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Payment history
                  </p>
                  {active.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {p.paymentNumber}{" "}
                        · {p.mode}
                      </span>
                      <span>₹{p.amount}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {active.balanceDue > 0 && active.status !== "CANCELLED" ? (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Collect payment
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        max={active.balanceDue}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mode</Label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Reference (optional)</Label>
                      <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="UPI transaction ID, cheque no., etc."
                      />
                    </div>
                  </div>
                  {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={submitPayment}
                      disabled={submitting || paying}
                    >
                      <Banknote className="h-4 w-4" />{" "}
                      {submitting ? "Recording…" : "Record manually"}
                    </Button>
                    <Button onClick={payOnline} disabled={submitting || paying}>
                      <CreditCard className="h-4 w-4" /> {paying ? "Opening…" : "Pay online"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    "Pay online" opens the Razorpay checkout for the exact outstanding balance shown
                    above — GST is already included, since it was calculated into the invoice when
                    it was created.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
