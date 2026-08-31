import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiFetchPublic, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import type { PlanApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/org/plans")({
  head: () => ({
    meta: [
      { title: "Subscribe — MediUnivers" },
      {
        name: "description",
        content: "Pick a plan to activate your organization's subscription.",
      },
    ],
  }),
  component: ReSubscribePage,
});

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

interface GatewayOrder {
  invoiceId: number;
  gateway: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  publicKey: string;
  mock: boolean;
}

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function ReSubscribePage() {
  const { isPlatform, roleDef } = usePermissions();
  const navigate = useNavigate();
  const orgStatus = useAppSelector((s) => s.tenant.status);
  const isDraft = orgStatus === "DRAFT";
  const banner = isDraft
    ? {
        title: "Finish setting up your organization",
        body: "You created your account but haven't subscribed yet — pick a plan below to activate it.",
      }
    : {
        title: "Your subscription has lapsed",
        body: "Pick a plan below to reactivate your organization.",
      };
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingCode, setPayingCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then((all) => setPlans(all.filter((p) => !p.freeTrial)))
      .catch(() => setError("Couldn't load plans. Please refresh and try again."));
  }, []);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  async function subscribe(plan: PlanApiDto) {
    setError(null);
    setPayingCode(plan.code);
    try {
      const order = await apiFetch<GatewayOrder>(
        "/api/org/subscription/change-plan/gateway-order",
        {
          method: "POST",
          data: { planCode: plan.code },
        },
      );

      const confirm = async (
        gatewayOrderId: string,
        gatewayPaymentId: string,
        signature: string,
      ) => {
        try {
          await apiFetch("/api/org/subscription/change-plan/confirm", {
            method: "POST",
            data: { gateway: order.gateway, gatewayOrderId, gatewayPaymentId, signature },
          });
          toast.success("Subscription reactivated");
          setDone(true);
        } catch (err) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Payment succeeded but couldn't be confirmed — contact support.",
          );
        } finally {
          setPayingCode(null);
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
        description: `${plan.name} subscription`,
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
        modal: { ondismiss: () => setPayingCode(null) },
        theme: { color: "#0f766e" },
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start payment. Please try again.");
      setPayingCode(null);
    }
  }

  if (roleDef.key !== "ORG_OWNER") {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">{banner.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only your organization's owner can manage the subscription.
        </p>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-lg font-semibold">
          {isDraft ? "Subscription activated" : "Subscription reactivated"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Your organization is active.</p>
        <Button className="mt-5" onClick={() => navigate({ to: "/app", replace: true })}>
          Go to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-amber-300 bg-amber-50 p-4 text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-semibold">{banner.title}</p>
        </div>
        <p className="mt-1 text-sm">{banner.body}</p>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!plans ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.code} className="flex flex-col p-5">
              <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
              <p className="mt-1 text-xl font-semibold text-primary">
                {currency(p.priceWithTax)} / month
              </p>
              <p className="text-xs text-muted-foreground">
                {currency(p.priceWithoutTax)} + {p.taxPercent}% tax
              </p>
              <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                {p.highlights.map((h) => (
                  <li key={h}>• {h}</li>
                ))}
              </ul>
              <Button className="mt-4" onClick={() => subscribe(p)} disabled={payingCode !== null}>
                {payingCode === p.code ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
