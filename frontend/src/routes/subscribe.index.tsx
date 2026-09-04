import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import ReactSelect from "react-select";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { usePlatformSite } from "@/lib/platformSite";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { AddonPricingApiDto, PlanApiDto } from "@/lib/types";
import { readCheckoutSelection, clearCheckoutSelection } from "@/lib/checkoutSelection";
import { fetchIndiaCities, useIndiaStates } from "@/lib/indiaLocations";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/subscribe/")({
  head: () => ({
    meta: [
      { title: "Checkout — MediUnivers" },
      {
        name: "description",
        content: "Review your plan, add extras, tell us about your organization and subscribe.",
      },
    ],
  }),
  component: CheckoutPage,
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

interface SignupResult {
  organizationId: number;
  organizationCode: string;
  signupToken: string;
  status: string;
}

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const Required = () => <span className="font-bold text-destructive"> *</span>;

interface FieldErrors {
  organizationName?: string;
  headBranchName?: string;
  ownerFullName?: string;
  ownerEmail?: string;
}

function CheckoutBody() {
  const { site } = usePlatformSite();

  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [addonPricing, setAddonPricing] = useState<AddonPricingApiDto[] | null>(null);

  useEffect(() => {
    const stored = readCheckoutSelection();
    if (stored) {
      setPlanCode(stored.planCode);
      setBillingCycle(stored.billingCycle);
      setSelectedAddons(Object.fromEntries(stored.addons.map((a) => [a.addonType, a.quantity])));
    }
    setSelectionLoaded(true);
  }, []);

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then(setPlans)
      .catch(() => setPlans([]));
    apiFetchPublic<AddonPricingApiDto[]>("/api/public/addon-pricing")
      .then(setAddonPricing)
      .catch(() => setAddonPricing([]));
  }, []);

  // No selection carried from the marketing page (e.g. a bookmarked /subscribe link) — fall
  // back to whichever plan a Super Admin has marked as the default.
  useEffect(() => {
    if (!selectionLoaded || !plans || planCode) return;
    const fallback =
      plans.find((p) => p.defaultSelected) ?? plans.find((p) => !p.freeTrial) ?? plans[0];
    if (fallback) setPlanCode(fallback.code);
  }, [selectionLoaded, plans, planCode]);

  const plan = plans?.find((p) => p.code === planCode) ?? null;
  const isFreeTrial = !!plan?.freeTrial;

  function addonUnitPrice(a: AddonPricingApiDto) {
    return billingCycle === "YEARLY"
      ? (a.pricePerUnitYearly ?? a.pricePerUnitMonthly * 12)
      : a.pricePerUnitMonthly;
  }

  function toggleAddon(a: AddonPricingApiDto, checked: boolean) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (checked) next[a.addonType] = a.quantityBased ? Math.max(1, next[a.addonType] ?? 1) : 1;
      else delete next[a.addonType];
      return next;
    });
  }

  function setAddonQty(addonType: string, qty: number) {
    setSelectedAddons((prev) => ({ ...prev, [addonType]: Math.max(1, qty) }));
  }

  const addonsTotal = (addonPricing ?? []).reduce((sum, a) => {
    const qty = selectedAddons[a.addonType];
    return qty ? sum + addonUnitPrice(a) * qty : sum;
  }, 0);
  const planPrice = plan
    ? billingCycle === "YEARLY"
      ? (plan.priceWithTaxYearly ?? plan.priceWithTax * 12)
      : plan.priceWithTax
    : 0;
  const grandTotal = planPrice + (isFreeTrial ? 0 : addonsTotal);

  // ---------------- Organization details ----------------

  const [organizationName, setOrganizationName] = useState("");
  const [headBranchName, setHeadBranchName] = useState("Head Office");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const states = useIndiaStates();

  useEffect(() => {
    if (!state) {
      setCityOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    fetchIndiaCities(state)
      .then((cities) => {
        if (!cancelled) setCityOptions(cities);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const refs = {
    organizationName: useRef<HTMLInputElement>(null),
    headBranchName: useRef<HTMLInputElement>(null),
    ownerFullName: useRef<HTMLInputElement>(null),
    ownerEmail: useRef<HTMLInputElement>(null),
  };

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!organizationName.trim()) next.organizationName = "Organization name is required.";
    if (!headBranchName.trim()) next.headBranchName = "Head office / main branch name is required.";
    if (!ownerFullName.trim()) next.ownerFullName = "Your full name is required.";
    if (!ownerEmail.trim()) {
      next.ownerEmail = "Work email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      next.ownerEmail = "Enter a valid email address.";
    }
    return next;
  }

  async function payAndConfirm(orgId: number, signupToken: string, order: GatewayOrder) {
    const confirm = async (gatewayOrderId: string, gatewayPaymentId: string, signature: string) => {
      try {
        await apiFetchPublic(`/api/public/organizations/${orgId}/subscribe/confirm`, {
          method: "POST",
          headers: { "X-Signup-Token": signupToken },
          data: { gateway: order.gateway, gatewayOrderId, gatewayPaymentId, signature },
        });
        clearCheckoutSelection();
        setDone(true);
      } catch (err) {
        setSubmitError(
          err instanceof ApiError
            ? err.message
            : "Payment succeeded but couldn't be confirmed — contact support.",
        );
      } finally {
        setSubmitting(false);
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
      description: plan ? `${plan.name} subscription` : "Subscription",
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
      modal: { ondismiss: () => setSubmitting(false) },
      theme: { color: "#0f766e" },
    });
    checkout.open();
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validate();
    setErrors(fieldErrors);
    const firstInvalid = (Object.keys(fieldErrors) as (keyof FieldErrors)[])[0];
    if (firstInvalid) {
      refs[firstInvalid]?.current?.focus();
      refs[firstInvalid]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!agreedToTerms) {
      setSubmitError("Please agree to the Terms & Conditions to continue.");
      return;
    }
    if (!plan) {
      setSubmitError("Choose a plan first.");
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isFreeTrial) {
        await apiFetchPublic("/api/public/organizations/free-trial", {
          method: "POST",
          data: {
            organizationName: organizationName.trim(),
            subdomain: subdomain.trim() || null,
            phone: phone.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            country: "India",
            gstNumber: gstNumber.trim() || null,
            headBranchName: headBranchName.trim(),
            ownerFullName: ownerFullName.trim(),
            ownerEmail: ownerEmail.trim(),
          },
        });
        clearCheckoutSelection();
        setDone(true);
        setSubmitting(false);
        return;
      }

      const result = await apiFetchPublic<SignupResult>(
        "/api/public/organizations/create-account",
        {
          method: "POST",
          data: {
            organizationName: organizationName.trim(),
            subdomain: subdomain.trim() || null,
            phone: phone.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
            country: "India",
            gstNumber: gstNumber.trim() || null,
            headBranchName: headBranchName.trim(),
            ownerFullName: ownerFullName.trim(),
            ownerEmail: ownerEmail.trim(),
          },
        },
      );

      const order = await apiFetchPublic<GatewayOrder>(
        `/api/public/organizations/${result.organizationId}/select-plan`,
        {
          method: "POST",
          headers: { "X-Signup-Token": result.signupToken },
          data: {
            planCode: plan.code,
            billingCycle,
            addons: Object.entries(selectedAddons).map(([addonType, quantity]) => ({
              addonType,
              quantity,
            })),
          },
        },
      );

      await payAndConfirm(result.organizationId, result.signupToken, order);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Couldn't continue. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <Card className="p-10">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {isFreeTrial ? "Free trial activated" : "Subscription active"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We've emailed you a link to set your password. Once you've set it, sign in to get
            started.
          </p>
          <Button asChild className="mt-5">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Your selection</h2>
        {!plans ? (
          <Skeleton className="mt-4 h-32 rounded-lg" />
        ) : !plan ? (
          <p className="mt-2 text-sm text-destructive">
            No plan is available right now — please try again shortly.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isFreeTrial
                    ? `Free / ${plan.freeTrialDays} days`
                    : `Billed ${billingCycle === "YEARLY" ? "yearly" : "monthly"}`}
                </p>
              </div>
              <p className="text-lg font-semibold text-primary">
                {isFreeTrial
                  ? "Free"
                  : `${currency(planPrice)} / ${billingCycle === "YEARLY" ? "year" : "month"}`}
              </p>
            </div>

            {addonPricing && addonPricing.length > 0 && !isFreeTrial ? (
              <div className="mt-4">
                <Label>Addons — still editable here</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {addonPricing.map((a) => {
                    const checked = a.addonType in selectedAddons;
                    return (
                      <div
                        key={a.addonType}
                        className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                      >
                        <label className="flex flex-1 items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleAddon(a, !!v)}
                          />
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
                            onChange={(e) => setAddonQty(a.addonType, Number(e.target.value) || 1)}
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
              </div>
            ) : null}

            {!isFreeTrial ? (
              <p className="mt-4 text-right text-sm font-semibold text-foreground">
                Total: {currency(grandTotal)} / {billingCycle === "YEARLY" ? "year" : "month"}
              </p>
            ) : null}
          </>
        )}
      </Card>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={handleContinue} noValidate>
          <h2 className="text-lg font-semibold text-foreground">Organization details</h2>
          <p className="text-xs text-muted-foreground">
            Fields marked <span className="font-bold text-destructive">*</span> are required.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="s-org">
                Organization name
                <Required />
              </Label>
              <Input
                id="s-org"
                ref={refs.organizationName}
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className={cn(errors.organizationName && "border-destructive")}
              />
              {errors.organizationName ? (
                <p className="text-xs text-destructive">{errors.organizationName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-branch">
                Head office / main branch name
                <Required />
              </Label>
              <Input
                id="s-branch"
                ref={refs.headBranchName}
                value={headBranchName}
                onChange={(e) => setHeadBranchName(e.target.value)}
                className={cn(errors.headBranchName && "border-destructive")}
              />
              {errors.headBranchName ? (
                <p className="text-xs text-destructive">{errors.headBranchName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-owner">
                Your full name
                <Required />
              </Label>
              <Input
                id="s-owner"
                ref={refs.ownerFullName}
                value={ownerFullName}
                onChange={(e) => setOwnerFullName(e.target.value)}
                className={cn(errors.ownerFullName && "border-destructive")}
              />
              {errors.ownerFullName ? (
                <p className="text-xs text-destructive">{errors.ownerFullName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">
                Work email (used to sign in)
                <Required />
              </Label>
              <Input
                id="s-email"
                ref={refs.ownerEmail}
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className={cn(errors.ownerEmail && "border-destructive")}
              />
              {errors.ownerEmail ? (
                <p className="text-xs text-destructive">{errors.ownerEmail}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-state">State</Label>
              <ReactSelect
                inputId="s-state"
                instanceId="s-state"
                isSearchable
                options={states.map((s) => ({ label: s, value: s }))}
                value={state ? { label: state, value: state } : null}
                onChange={(opt) => {
                  setState(opt?.value ?? "");
                  setCity("");
                }}
                placeholder="Select state"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-city">City</Label>
              <ReactSelect
                inputId="s-city"
                instanceId="s-city"
                isSearchable
                isDisabled={!state}
                isLoading={loadingCities}
                options={cityOptions.map((c) => ({ label: c, value: c }))}
                value={city ? { label: city, value: city } : null}
                onChange={(opt) => setCity(opt?.value ?? "")}
                placeholder={state ? "Select city" : "Select a state first"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-gst">GST number (optional)</Label>
              <Input
                id="s-gst"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="s-subdomain">Preferred subdomain</Label>
              <Input
                id="s-subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="nairclinic"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(v) => setAgreedToTerms(!!v)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I agree to the{" "}
              <Link
                to="/terms"
                target="_blank"
                className="text-primary underline-offset-2 hover:underline"
              >
                Terms &amp; Conditions
              </Link>
              {site?.termsContent
                ? ""
                : " (default terms apply until MediUnivers publishes its own)"}
            </span>
          </label>

          {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || !plan}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isFreeTrial ? "Starting trial…" : "Processing…"}
              </>
            ) : isFreeTrial ? (
              "Start free trial"
            ) : (
              "Continue to payment"
            )}
          </Button>
        </form>
      </Card>
    </section>
  );
}

function CheckoutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Checkout"
        title="Almost there"
        subtitle="Review your plan, tell us about your organization, and you're in."
      />
      <CheckoutBody />
    </SiteLayout>
  );
}
