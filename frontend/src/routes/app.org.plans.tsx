import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiFetchPublic, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import type { AddonPricingApiDto, PlanApiDto, SubscriptionAddonApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  proratedCredit: number;
}

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const LIVE_STATUSES = new Set(["ACTIVE", "TRIAL", "GRACE_PERIOD"]);

function ReSubscribePage() {
  const { isPlatform, roleDef } = usePermissions();
  const navigate = useNavigate();
  const orgStatus = useAppSelector((s) => s.tenant.status);
  const currentPlanCode = useAppSelector((s) => s.tenant.planCode);
  const renewsOn = useAppSelector((s) => s.tenant.renewsOn);
  const isDraft = orgStatus === "DRAFT";
  const isLive = LIVE_STATUSES.has(orgStatus);
  const banner = isDraft
    ? {
        title: "Finish setting up your organization",
        body: "You created your account but haven't subscribed yet — pick a plan below to activate it.",
      }
    : isLive
      ? {
          title: "Upgrade your plan",
          body: renewsOn
            ? `Your current plan renews on ${new Date(renewsOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Switching now credits the unused portion of your current plan against the new one.`
            : "Pick a higher plan below — the unused portion of your current plan is credited against the new one.",
        }
      : {
          title: "Your subscription has lapsed",
          body: "Pick a plan below to reactivate your organization.",
        };
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingCode, setPayingCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [addonPricing, setAddonPricing] = useState<AddonPricingApiDto[] | null>(null);
  const [currentAddons, setCurrentAddons] = useState<SubscriptionAddonApiDto[] | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [addonsSaving, setAddonsSaving] = useState(false);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then((all) => setPlans(all.filter((p) => !p.freeTrial)))
      .catch(() => setError("Couldn't load plans. Please refresh and try again."));
    apiFetchPublic<AddonPricingApiDto[]>("/api/public/addon-pricing")
      .then(setAddonPricing)
      .catch(() => setAddonPricing([]));
  }, []);

  useEffect(() => {
    if (!isLive) return;
    apiFetch<SubscriptionAddonApiDto[]>("/api/org/subscription/addons")
      .then((data) => {
        setCurrentAddons(data);
        setSelectedAddons(Object.fromEntries(data.map((a) => [a.addonType, a.quantity])));
      })
      .catch(() => setCurrentAddons([]));
  }, [isLive]);

  function addonUnitPrice(a: AddonPricingApiDto) {
    if (billingCycle === "YEARLY") return a.pricePerUnitYearly ?? a.pricePerUnitMonthly * 12;
    return a.pricePerUnitMonthly;
  }

  function toggleAddon(a: AddonPricingApiDto, checked: boolean) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (checked) next[a.addonType] = a.quantityBased ? Math.max(1, next[a.addonType] ?? 1) : 1;
      else delete next[a.addonType];
      return next;
    });
  }

  function setAddonQuantity(addonType: string, quantity: number) {
    setSelectedAddons((prev) => ({ ...prev, [addonType]: Math.max(1, quantity) }));
  }

  const addonSelections = Object.entries(selectedAddons).map(([addonType, quantity]) => ({
    addonType,
    quantity,
  }));

  async function saveAddons() {
    if (!currentPlanCode) return;
    setAddonsSaving(true);
    setError(null);
    try {
      const order = await apiFetch<GatewayOrder>(
        "/api/org/subscription/change-plan/gateway-order",
        {
          method: "POST",
          data: { planCode: currentPlanCode, billingCycle, addons: addonSelections },
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
          toast.success("Addons updated");
          setAddonsOpen(false);
          window.location.reload();
        } catch (err) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Payment succeeded but couldn't be confirmed — contact support.",
          );
        } finally {
          setAddonsSaving(false);
        }
      };

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
        description: "Addon update",
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
        modal: { ondismiss: () => setAddonsSaving(false) },
        theme: { color: "#0f766e" },
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update addons. Please try again.");
      setAddonsSaving(false);
    }
  }

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
          data: { planCode: plan.code, billingCycle, addons: addonSelections },
        },
      );

      if (order.proratedCredit > 0) {
        toast.info(`${currency(order.proratedCredit)} credit applied from your current plan`, {
          description: `You pay ${currency(order.amount)} today for ${plan.name}.`,
        });
      }

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
          toast.success(isLive ? "Plan upgraded" : "Subscription reactivated");
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
          {isDraft
            ? "Subscription activated"
            : isLive
              ? "Plan upgraded"
              : "Subscription reactivated"}
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
      <Card
        className={
          isLive
            ? "border-primary/25 bg-primary/5 p-4 text-foreground"
            : "border-amber-300 bg-amber-50 p-4 text-amber-800"
        }
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-semibold">{banner.title}</p>
        </div>
        <p className="mt-1 text-sm">{banner.body}</p>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-border p-1">
          {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billingCycle === cycle
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      {!plans ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = isLive && p.code === currentPlanCode;
            const priceWithTax =
              billingCycle === "YEARLY"
                ? (p.priceWithTaxYearly ?? p.priceWithTax * 12)
                : p.priceWithTax;
            const priceWithoutTax =
              billingCycle === "YEARLY"
                ? (p.priceWithoutTaxYearly ?? p.priceWithoutTax * 12)
                : p.priceWithoutTax;
            return (
              <Card key={p.code} className="flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
                  {isCurrent ? (
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Current plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xl font-semibold text-primary">
                  {currency(priceWithTax)} / {billingCycle === "YEARLY" ? "year" : "month"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currency(priceWithoutTax)} + {p.taxPercent}% tax
                </p>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                  {p.highlights.map((h) => (
                    <li key={h}>• {h}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={isCurrent ? "outline" : "default"}
                  onClick={() => subscribe(p)}
                  disabled={payingCode !== null || isCurrent}
                >
                  {payingCode === p.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Your current plan"
                  ) : isLive ? (
                    "Upgrade"
                  ) : (
                    "Subscribe"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {addonPricing && addonPricing.length > 0 ? (
        <Card className="p-5">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setAddonsOpen((v) => !v)}
          >
            <div>
              <h2 className="text-sm font-semibold text-foreground">Addons</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentAddons && currentAddons.length > 0
                  ? `${currentAddons.length} addon(s) active`
                  : "SMS, WhatsApp, online payments, extra branches/doctors/staff/storage"}
              </p>
            </div>
          </button>
          {addonsOpen ? (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {addonPricing.map((a) => {
                  const checked = a.addonType in selectedAddons;
                  return (
                    <div
                      key={a.addonType}
                      className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                    >
                      <label className="flex flex-1 items-center gap-2">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleAddon(a, !!v)} />
                        <span>
                          {a.label}
                          {a.quantityBased && a.unitLabel ? (
                            <span className="text-muted-foreground"> (per {a.unitLabel})</span>
                          ) : null}
                        </span>
                      </label>
                      {checked && a.quantityBased ? (
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-16"
                          value={selectedAddons[a.addonType]}
                          onChange={(e) =>
                            setAddonQuantity(a.addonType, Number(e.target.value) || 1)
                          }
                        />
                      ) : null}
                      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                        {currency(addonUnitPrice(a))}
                        {billingCycle === "YEARLY" ? "/yr" : "/mo"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isLive ? (
                <Button onClick={saveAddons} disabled={addonsSaving}>
                  {addonsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save addons"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick your addons here, then subscribe to a plan above — they're added together.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
