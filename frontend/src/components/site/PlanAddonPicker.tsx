import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { apiFetchPublic } from "@/lib/api";
import type { AddonPricingApiDto, PlanApiDto } from "@/lib/types";
import { storeCheckoutSelection } from "@/lib/checkoutSelection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MODULE_LABELS: Record<string, string> = {
  ORG: "Organization & users",
  CLINIC: "Clinic management",
  PHARMACY: "Pharmacy",
  LAB: "Laboratory",
  CRM: "Patient CRM",
  CMS: "Website & CMS",
  PATIENT: "Patient portal",
};

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * The one interactive plan + addon picker shown on both the Home and Pricing pages — pick a
 * plan (one is pre-selected per Plan.defaultSelected, configured by a Super Admin), optionally a
 * billing cycle and addons, and a floating bar tracks the running total with a Subscribe button
 * that carries the whole selection through to the /subscribe checkout page.
 */
export function PlanAddonPicker() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanApiDto[] | null>(null);
  const [addons, setAddons] = useState<AddonPricingApiDto[] | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  useEffect(() => {
    apiFetchPublic<PlanApiDto[]>("/api/public/plans")
      .then((all) => {
        setPlans(all);
        const preferred =
          all.find((p) => p.defaultSelected) ?? all.find((p) => !p.freeTrial) ?? all[0];
        if (preferred) setSelectedPlanCode(preferred.code);
      })
      .catch(() => setPlans([]));
    apiFetchPublic<AddonPricingApiDto[]>("/api/public/addon-pricing")
      .then(setAddons)
      .catch(() => setAddons([]));
  }, []);

  const selectedPlan = useMemo(
    () => plans?.find((p) => p.code === selectedPlanCode) ?? null,
    [plans, selectedPlanCode],
  );
  const isFreeTrial = !!selectedPlan?.freeTrial;

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

  function addonUnitPrice(a: AddonPricingApiDto) {
    if (billingCycle === "YEARLY") return a.pricePerUnitYearly ?? a.pricePerUnitMonthly * 12;
    return a.pricePerUnitMonthly;
  }

  const addonsTotal = (addons ?? []).reduce((sum, a) => {
    const qty = selectedAddons[a.addonType];
    return qty ? sum + addonUnitPrice(a) * qty : sum;
  }, 0);

  const planPrice = selectedPlan
    ? billingCycle === "YEARLY"
      ? (selectedPlan.priceWithTaxYearly ?? selectedPlan.priceWithTax * 12)
      : selectedPlan.priceWithTax
    : 0;
  const grandTotal = planPrice + (isFreeTrial ? 0 : addonsTotal);
  const selectedAddonCount = Object.keys(selectedAddons).length;

  function handleSubscribe() {
    if (!selectedPlan) return;
    storeCheckoutSelection({
      planCode: selectedPlan.code,
      billingCycle,
      addons: isFreeTrial
        ? []
        : Object.entries(selectedAddons).map(([addonType, quantity]) => ({ addonType, quantity })),
    });
    navigate({ to: "/subscribe" });
  }

  if (plans && plans.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 pb-32">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Pick a plan and make it yours
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a plan, add any extras you need, then subscribe — everything shown here comes
            with you to checkout.
          </p>
        </div>
        {plans ? (
          <div className="inline-flex rounded-lg border border-border p-1">
            {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  billingCycle === cycle
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!plans ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              const isSelected = p.code === selectedPlanCode;
              const price =
                billingCycle === "YEARLY"
                  ? (p.priceWithTaxYearly ?? p.priceWithTax * 12)
                  : p.priceWithTax;
              return (
                <Card
                  key={p.code}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlanCode(p.code)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedPlanCode(p.code)}
                  className={cn(
                    "flex cursor-pointer flex-col p-6 transition-all",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40"
                      : "hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                    {isSelected ? (
                      <Badge className="bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" /> Selected
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold text-primary">
                    {p.freeTrial
                      ? `Free / ${p.freeTrialDays} days`
                      : `${currency(price)} / ${billingCycle === "YEARLY" ? "year" : "month"}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.modules
                      .filter((m) => MODULE_LABELS[m])
                      .map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px]">
                          {MODULE_LABELS[m]}
                        </Badge>
                      ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {addons && addons.length > 0 && !isFreeTrial ? (
            <div className="mt-10">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Add extras to your plan
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                SMS, WhatsApp and online payment collection are simple on/off unlocks; extra
                branches, doctors, staff and storage raise your plan's limits per unit.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {addons.map((a) => {
                  const checked = a.addonType in selectedAddons;
                  return (
                    <Card key={a.addonType} className="flex items-center justify-between gap-2 p-3">
                      <label className="flex flex-1 items-center gap-2 text-sm">
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
                          onChange={(e) => setAddonQty(a.addonType, Number(e.target.value) || 1)}
                        />
                      ) : null}
                      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                        {currency(addonUnitPrice(a))}
                        {billingCycle === "YEARLY" ? "/yr" : "/mo"}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      {selectedPlan ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{selectedPlan.name}</span>
              {selectedAddonCount > 0 ? (
                <span className="text-muted-foreground"> + {selectedAddonCount} addon(s)</span>
              ) : null}
              {!isFreeTrial ? (
                <span className="ml-2 font-semibold text-primary">
                  {currency(grandTotal)} / {billingCycle === "YEARLY" ? "year" : "month"}
                </span>
              ) : null}
            </div>
            <Button size="lg" onClick={handleSubscribe}>
              {isFreeTrial ? "Start free trial" : "Subscribe"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
