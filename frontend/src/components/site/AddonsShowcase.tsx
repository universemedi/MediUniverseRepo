import { useEffect, useState } from "react";
import { apiFetchPublic } from "@/lib/api";
import type { AddonPricingApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function currency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Public marketing preview of the addon catalog — real prices, a purely local "what would this
 * cost" selector (no checkout here; actual purchase happens during /subscribe). Shared by the
 * Pricing page and the Home page so both always show the same live catalog. */
export function AddonsShowcase() {
  const [addons, setAddons] = useState<AddonPricingApiDto[] | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});

  useEffect(() => {
    apiFetchPublic<AddonPricingApiDto[]>("/api/public/addon-pricing")
      .then(setAddons)
      .catch(() => setAddons([]));
  }, []);

  function toggle(a: AddonPricingApiDto, checked: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) next[a.addonType] = a.quantityBased ? Math.max(1, next[a.addonType] ?? 1) : 1;
      else delete next[a.addonType];
      return next;
    });
  }

  function setQty(addonType: string, qty: number) {
    setSelected((prev) => ({ ...prev, [addonType]: Math.max(1, qty) }));
  }

  const total = (addons ?? []).reduce((sum, a) => {
    const qty = selected[a.addonType];
    return qty ? sum + a.pricePerUnitMonthly * qty : sum;
  }, 0);

  if (addons && addons.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Add extras to any plan
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        SMS, WhatsApp and online payment collection are simple on/off unlocks; extra branches,
        doctors, staff and storage raise your plan's limits per unit — mix and match on top of
        whichever plan you choose.
      </p>

      {!addons ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => {
              const checked = a.addonType in selected;
              return (
                <Card key={a.addonType} className="flex items-center justify-between gap-2 p-3">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggle(a, !!v)} />
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
                      value={selected[a.addonType]}
                      onChange={(e) => setQty(a.addonType, Number(e.target.value) || 1)}
                    />
                  ) : null}
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {currency(a.pricePerUnitMonthly)}/mo
                  </span>
                </Card>
              );
            })}
          </div>
          {Object.keys(selected).length > 0 ? (
            <p className="mt-4 text-sm font-medium text-foreground">
              Selected extras: {currency(total)} / month
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
