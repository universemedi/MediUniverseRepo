import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { ModulePriceApiDto, PlanApiDto } from "@/lib/types";
import { readSignupSession, clearSignupSession, type SignupSession } from "@/lib/signupSession";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/subscribe/plans")({
  head: () => ({
    meta: [
      { title: "Choose Your Plan — MediUnivers" },
      {
        name: "description",
        content: "Compare plans in full detail and subscribe to activate your organization.",
      },
    ],
  }),
  component: ChoosePlanPage,
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

const MODULE_LABELS: Record<string, string> = {
  CLINIC: "Clinic",
  PHARMACY: "Pharmacy",
  LAB: "Laboratory",
  CRM: "Patient CRM",
  CMS: "Website Builder",
};

const CUSTOM_TAX_PERCENT = 18;

/** Runs the shared Razorpay checkout + confirm step against whatever gateway order the caller already created. */
async function payAndConfirm(
  session: SignupSession,
  order: GatewayOrder,
  description: string,
  onDone: () => void,
  onError: (message: string) => void,
) {
  const confirm = async (gatewayOrderId: string, gatewayPaymentId: string, signature: string) => {
    try {
      await apiFetchPublic(`/api/public/organizations/${session.orgId}/subscribe/confirm`, {
        method: "POST",
        headers: { "X-Signup-Token": session.token },
        data: { gateway: order.gateway, gatewayOrderId, gatewayPaymentId, signature },
      });
      clearSignupSession();
      toast.success("Subscription active", {
        description: "Check your email to set your password.",
      });
      onDone();
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.message
          : "Payment succeeded but couldn't be confirmed — contact support.",
      );
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
    description,
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
    modal: { ondismiss: () => onError("") },
    theme: { color: "#0f766e" },
  });
  checkout.open();
}

function ChoosePlanPage() {
  const [session, setSession] = useState<SignupSession | null | undefined>(undefined);
  const [preselect, setPreselect] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingCode, setPayingCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [modulePrices, setModulePrices] = useState<ModulePriceApiDto[] | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [customBranches, setCustomBranches] = useState("5");
  const [customUsers, setCustomUsers] = useState("25");
  const [customDoctors, setCustomDoctors] = useState("10");
  const [customError, setCustomError] = useState<string | null>(null);
  const [customPaying, setCustomPaying] = useState(false);

  useEffect(() => {
    const { session: stored, preselectPlan } = readSignupSession();
    setSession(stored);
    setPreselect(preselectPlan);
  }, []);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then((all) => setPlans(all.filter((p) => !p.freeTrial)))
      .catch(() => setError("Couldn't load plans. Please refresh and try again."));
    apiFetchPublic<ModulePriceApiDto[]>("/api/public/module-prices")
      .then(setModulePrices)
      .catch(() => setModulePrices([]));
  }, []);

  async function subscribe(plan: PlanApiDto) {
    if (!session) return;
    setError(null);
    setPayingCode(plan.code);
    try {
      const order = await apiFetchPublic<GatewayOrder>(
        `/api/public/organizations/${session.orgId}/select-plan`,
        {
          method: "POST",
          headers: { "X-Signup-Token": session.token },
          data: { planCode: plan.code },
        },
      );
      await payAndConfirm(
        session,
        order,
        `${plan.name} subscription`,
        () => setDone(true),
        (message) => {
          if (message) toast.error(message);
          setPayingCode(null);
        },
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start payment. Please try again.");
      setPayingCode(null);
    }
  }

  function toggleCustomModule(group: string, checked: boolean) {
    setSelectedModules((prev) => (checked ? [...prev, group] : prev.filter((m) => m !== group)));
  }

  const customTotal = (modulePrices ?? [])
    .filter((m) => selectedModules.includes(m.moduleGroup))
    .reduce((sum, m) => sum + m.pricePerMonth, 0);
  const customTotalWithTax = customTotal * (1 + CUSTOM_TAX_PERCENT / 100);

  async function subscribeCustom() {
    if (!session) return;
    if (selectedModules.length === 0) {
      setCustomError("Pick at least one module.");
      return;
    }
    const maxBranches = Number(customBranches);
    const maxUsers = Number(customUsers);
    const maxDoctorsPerBranch = Number(customDoctors);
    if (!maxBranches || !maxUsers || !maxDoctorsPerBranch) {
      setCustomError("Branches, users and doctors per branch must all be at least 1.");
      return;
    }
    setCustomError(null);
    setCustomPaying(true);
    try {
      const order = await apiFetchPublic<GatewayOrder>(
        `/api/public/organizations/${session.orgId}/select-custom-plan`,
        {
          method: "POST",
          headers: { "X-Signup-Token": session.token },
          data: { modules: selectedModules, maxBranches, maxUsers, maxDoctorsPerBranch },
        },
      );
      await payAndConfirm(
        session,
        order,
        "Custom plan subscription",
        () => setDone(true),
        (message) => {
          if (message) toast.error(message);
          setCustomPaying(false);
        },
      );
    } catch (err) {
      setCustomError(
        err instanceof ApiError ? err.message : "Couldn't start payment. Please try again.",
      );
      setCustomPaying(false);
    }
  }

  if (session === undefined) return null;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Step 2 of 2"
        title="Choose your plan"
        subtitle={
          session
            ? `Organization ${session.orgCode} created — pick a plan to activate it.`
            : "Choose a plan."
        }
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        {done ? (
          <Card className="mx-auto max-w-md p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Subscription active</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We've emailed you a link to set your password. Once you've set it, sign in to get
              started.
            </p>
            <Button asChild className="mt-5">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </Card>
        ) : session === null ? (
          <Card className="mx-auto max-w-md p-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No account found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your organization account first, then come back here to choose a plan.
            </p>
            <Button asChild className="mt-5">
              <Link to="/subscribe">Create your account</Link>
            </Button>
          </Card>
        ) : !plans ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <Card
                  key={p.code}
                  className={`flex flex-col p-6 ${preselect === p.code ? "border-primary ring-1 ring-primary/40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground">{p.name}</h2>
                    {p.code === "PROFESSIONAL" ? (
                      <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-primary">
                    {currency(p.priceWithTax)} / month
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currency(p.priceWithoutTax)} + {p.taxPercent}% tax
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>

                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {p.modules
                      .filter((m) => MODULE_LABELS[m])
                      .map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px]">
                          {MODULE_LABELS[m]}
                        </Badge>
                      ))}
                  </div>

                  <div className="mt-4 space-y-1 border-t pt-4 text-xs text-muted-foreground">
                    <p>{p.maxBranches} branches</p>
                    <p>{p.maxUsers} users</p>
                    <p>{p.maxDoctorsPerBranch} doctors / branch</p>
                    <p>{p.storageLabel} storage</p>
                  </div>

                  <Button
                    className="mt-5"
                    variant={p.code === "PROFESSIONAL" ? "default" : "outline"}
                    onClick={() => subscribe(p)}
                    disabled={payingCode !== null}
                  >
                    {payingCode === p.code ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                      </>
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="mt-8 p-6">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowCustom((v) => !v)}
              >
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Don't see a plan that fits? Build a custom plan
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick exactly the modules you need — price is calculated per module, per month.
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${showCustom ? "rotate-180" : ""}`}
                />
              </button>

              {showCustom ? (
                !modulePrices ? (
                  <Skeleton className="mt-4 h-48 rounded-xl" />
                ) : (
                  <div className="mt-5 space-y-5 border-t pt-5">
                    <div className="space-y-2">
                      <Label>
                        Modules
                        <span className="ml-1 font-bold text-destructive">*</span>
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modulePrices.map((m) => (
                          <label
                            key={m.moduleGroup}
                            className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedModules.includes(m.moduleGroup)}
                                onCheckedChange={(v) => toggleCustomModule(m.moduleGroup, !!v)}
                              />
                              {MODULE_LABELS[m.moduleGroup] ?? m.label}
                            </span>
                            <span className="text-muted-foreground">
                              {currency(m.pricePerMonth)}/mo
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="c-branches">
                          Branches
                          <span className="ml-1 font-bold text-destructive">*</span>
                        </Label>
                        <Input
                          id="c-branches"
                          type="number"
                          min={1}
                          value={customBranches}
                          onChange={(e) => setCustomBranches(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="c-users">
                          Users
                          <span className="ml-1 font-bold text-destructive">*</span>
                        </Label>
                        <Input
                          id="c-users"
                          type="number"
                          min={1}
                          value={customUsers}
                          onChange={(e) => setCustomUsers(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="c-doctors">
                          Doctors / branch
                          <span className="ml-1 font-bold text-destructive">*</span>
                        </Label>
                        <Input
                          id="c-doctors"
                          type="number"
                          min={1}
                          value={customDoctors}
                          onChange={(e) => setCustomDoctors(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated total</p>
                        <p className="text-xl font-semibold text-primary">
                          {currency(customTotalWithTax)} / month
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currency(customTotal)} + {CUSTOM_TAX_PERCENT}% tax
                        </p>
                      </div>
                      <Button onClick={subscribeCustom} disabled={customPaying}>
                        {customPaying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                          </>
                        ) : (
                          "Subscribe to custom plan"
                        )}
                      </Button>
                    </div>
                    {customError ? <p className="text-sm text-destructive">{customError}</p> : null}
                  </div>
                )
              ) : null}
            </Card>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Looking for a free trial instead?{" "}
              <Link to="/free-trial" className="text-primary underline-offset-2 hover:underline">
                Start here
              </Link>
              .
            </p>
          </>
        )}
      </section>
    </SiteLayout>
  );
}
