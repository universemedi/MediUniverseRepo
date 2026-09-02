import { Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export const BUSINESS_HOURS_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}
export type BusinessHours = Record<(typeof BUSINESS_HOURS_DAYS)[number]["key"], DayHours>;

export function defaultBusinessHours(): BusinessHours {
  const hours = {} as BusinessHours;
  for (const d of BUSINESS_HOURS_DAYS) {
    hours[d.key] = { enabled: d.key !== "sunday", start: "09:00", end: "18:00" };
  }
  return hours;
}

export function parseBusinessHours(json: string | null | undefined): BusinessHours {
  const fallback = defaultBusinessHours();
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json) as Partial<BusinessHours>;
    const result = defaultBusinessHours();
    for (const d of BUSINESS_HOURS_DAYS) {
      if (parsed[d.key]) result[d.key] = { ...result[d.key], ...parsed[d.key] };
    }
    return result;
  } catch {
    return fallback;
  }
}

/** Returns an error message if any enabled day has start >= end, else null. */
export function validateBusinessHours(hours: BusinessHours): string | null {
  for (const d of BUSINESS_HOURS_DAYS) {
    const h = hours[d.key];
    if (h.enabled && h.start >= h.end) {
      return `${d.label}: closing time must be after opening time.`;
    }
  }
  return null;
}

export function BusinessHoursEditor({
  value,
  onChange,
  disabled,
  title = "Business hours",
}: {
  value: BusinessHours;
  onChange: (next: BusinessHours) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Clock className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-2">
        {BUSINESS_HOURS_DAYS.map((d) => {
          const hours = value[d.key];
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 shrink-0 items-center gap-2 text-sm">
                <Checkbox
                  checked={hours.enabled}
                  disabled={disabled}
                  onCheckedChange={(v) =>
                    onChange({ ...value, [d.key]: { ...value[d.key], enabled: !!v } })
                  }
                />
                {d.label}
              </label>
              <Input
                type="time"
                className="w-32"
                value={hours.start}
                disabled={disabled || !hours.enabled}
                onChange={(e) =>
                  onChange({ ...value, [d.key]: { ...value[d.key], start: e.target.value } })
                }
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="time"
                className="w-32"
                value={hours.end}
                disabled={disabled || !hours.enabled}
                onChange={(e) =>
                  onChange({ ...value, [d.key]: { ...value[d.key], end: e.target.value } })
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
