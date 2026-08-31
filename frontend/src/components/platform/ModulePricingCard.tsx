import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { ModulePriceApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

/**
 * Per-module monthly rate a Super Admin sets — used to price a customer's
 * own "build a plan" selection on the public /subscribe/plans page when
 * none of the fixed plans fit (req: "option to define price for each
 * module/month").
 */
export function ModulePricingCard({ readOnly }: { readOnly: boolean }) {
  const [prices, setPrices] = useState<ModulePriceApiDto[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  function load() {
    apiFetch<ModulePriceApiDto[]>("/api/platform/module-prices")
      .then((data) => {
        setPrices(data);
        setDrafts(Object.fromEntries(data.map((m) => [m.moduleGroup, String(m.pricePerMonth)])));
      })
      .catch(() => setPrices([]));
  }
  useEffect(load, []);

  async function save(m: ModulePriceApiDto) {
    const value = Number(drafts[m.moduleGroup]);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    setSavingGroup(m.moduleGroup);
    try {
      await apiFetch(`/api/platform/module-prices/${m.moduleGroup}`, {
        method: "PUT",
        data: { pricePerMonth: value, active: m.active },
      });
      toast.success(`${m.label} price updated`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save this price.");
    } finally {
      setSavingGroup(null);
    }
  }

  async function toggleActive(m: ModulePriceApiDto, active: boolean) {
    try {
      await apiFetch(`/api/platform/module-prices/${m.moduleGroup}`, {
        method: "PUT",
        data: { pricePerMonth: m.pricePerMonth, active },
      });
      toast.success(`${m.label} ${active ? "enabled" : "disabled"} for custom plans`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this module.");
    }
  }

  if (!prices) return null;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Module pricing (custom plans)
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          What a customer pays per module, per month, when they build their own plan instead of
          picking one of the fixed plans above.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prices.map((m) => (
          <div key={m.moduleGroup} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{m.label}</Label>
              {!readOnly ? (
                <Switch checked={m.active} onCheckedChange={(v) => toggleActive(m, v)} />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                min={0}
                disabled={readOnly}
                value={drafts[m.moduleGroup] ?? ""}
                onChange={(e) => setDrafts({ ...drafts, [m.moduleGroup]: e.target.value })}
              />
              {!readOnly ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => save(m)}
                  disabled={savingGroup === m.moduleGroup}
                >
                  {savingGroup === m.moduleGroup ? "…" : "Save"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
