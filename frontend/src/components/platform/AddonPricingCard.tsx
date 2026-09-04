import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { AddonPricingApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface Draft {
  monthly: string;
  yearly: string;
}

/** Super-admin-configured rate per addon (SMS, WhatsApp, Payment, extra branch/doctor/staff/storage) —
 * what an organization pays to attach it to their subscription, per the monthly or yearly cycle. */
export function AddonPricingCard({ readOnly }: { readOnly: boolean }) {
  const [addons, setAddons] = useState<AddonPricingApiDto[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingType, setSavingType] = useState<string | null>(null);

  function load() {
    apiFetch<AddonPricingApiDto[]>("/api/platform/addon-pricing")
      .then((data) => {
        setAddons(data);
        setDrafts(
          Object.fromEntries(
            data.map((a) => [
              a.addonType,
              {
                monthly: String(a.pricePerUnitMonthly),
                yearly: a.pricePerUnitYearly != null ? String(a.pricePerUnitYearly) : "",
              },
            ]),
          ),
        );
      })
      .catch(() => setAddons([]));
  }
  useEffect(load, []);

  async function save(a: AddonPricingApiDto) {
    const draft = drafts[a.addonType] ?? { monthly: "0", yearly: "" };
    const monthly = Number(draft.monthly);
    if (!Number.isFinite(monthly) || monthly < 0) {
      toast.error("Enter a valid monthly price.");
      return;
    }
    const yearly = draft.yearly.trim() === "" ? null : Number(draft.yearly);
    if (yearly != null && (!Number.isFinite(yearly) || yearly < 0)) {
      toast.error("Enter a valid yearly price, or leave it blank.");
      return;
    }
    setSavingType(a.addonType);
    try {
      await apiFetch(`/api/platform/addon-pricing/${a.addonType}`, {
        method: "PUT",
        data: { pricePerUnitMonthly: monthly, pricePerUnitYearly: yearly, active: a.active },
      });
      toast.success(`${a.label} price updated`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save this price.");
    } finally {
      setSavingType(null);
    }
  }

  async function toggleActive(a: AddonPricingApiDto, active: boolean) {
    try {
      await apiFetch(`/api/platform/addon-pricing/${a.addonType}`, {
        method: "PUT",
        data: {
          pricePerUnitMonthly: a.pricePerUnitMonthly,
          pricePerUnitYearly: a.pricePerUnitYearly,
          active,
        },
      });
      toast.success(`${a.label} ${active ? "enabled" : "disabled"}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this addon.");
    }
  }

  if (!addons) return null;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Addon pricing
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          What an organization pays to attach each addon to their subscription. Quantity-based
          addons (extra branch/doctor/staff/storage) are priced per unit; leave the yearly price
          blank to fall back to monthly x 12.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map((a) => (
          <div key={a.addonType} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{a.label}</Label>
                {a.quantityBased && a.unitLabel ? (
                  <p className="text-[11px] text-muted-foreground">per {a.unitLabel}</p>
                ) : null}
              </div>
              {!readOnly ? (
                <Switch checked={a.active} onCheckedChange={(v) => toggleActive(a, v)} />
              ) : null}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">/ month</span>
                <Input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={drafts[a.addonType]?.monthly ?? ""}
                  onChange={(e) =>
                    setDrafts({
                      ...drafts,
                      [a.addonType]: {
                        ...(drafts[a.addonType] ?? { monthly: "", yearly: "" }),
                        monthly: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">/ year</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="monthly x 12"
                  disabled={readOnly}
                  value={drafts[a.addonType]?.yearly ?? ""}
                  onChange={(e) =>
                    setDrafts({
                      ...drafts,
                      [a.addonType]: {
                        ...(drafts[a.addonType] ?? { monthly: "", yearly: "" }),
                        yearly: e.target.value,
                      },
                    })
                  }
                />
              </div>
              {!readOnly ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => save(a)}
                  disabled={savingType === a.addonType}
                >
                  {savingType === a.addonType ? "…" : "Save"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
