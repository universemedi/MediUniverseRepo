import type { ColumnDef, ModulePageDef } from "@/config/types";
import { CITIES, ORGS, dateOffset, intBetween, personName, pick, seeded } from "./mock";

export type Row = Record<string, string | number> & { id: string };

const TITLE_WORDS: Record<string, string[]> = {
  default: [
    "Standard",
    "Advanced",
    "Primary",
    "Daily",
    "Monthly",
    "General",
    "Central",
    "Express",
    "Prime",
    "Core",
  ],
};

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function valueFor(
  colDef: ColumnDef,
  rng: () => number,
  index: number,
  seedKey: string,
): string | number {
  const { key, type, options } = colDef;
  if (options && options.length) return pick(rng, options);
  switch (type) {
    case "name":
      return personName(rng);
    case "org":
      return `${pick(rng, ORGS)}${rng() > 0.7 ? " — Branch " + intBetween(rng, 1, 6) : ""}`;
    case "email":
      return `${personName(rng).toLowerCase().replace(/\s+/g, ".")}@mediunivers.io`;
    case "phone":
      return `+91 ${intBetween(rng, 70, 99)}${intBetween(rng, 10000000, 99999999)}`;
    case "city":
      return pick(rng, CITIES);
    case "money":
      return `₹ ${(intBetween(rng, 5, 900) * 100).toLocaleString("en-IN")}`;
    case "number":
      return intBetween(rng, 1, 240);
    case "percent":
      return `${intBetween(rng, 5, 60)}%`;
    case "date":
      return dateOffset(intBetween(rng, -180, 60));
    case "code":
      return `${seedKey.slice(0, 3).toUpperCase()}-${(1000 + index).toString()}`;
    default: {
      const words = TITLE_WORDS["default"] as string[];
      const label = colDef.label.replace(/\s*\(.*\)/, "");
      if (key === "slug") return label.toLowerCase().replace(/\s+/g, "-") + "-" + index;
      if (key === "openTime" || key === "closeTime" || key === "slot" || key === "checkIn")
        return `${String(intBetween(rng, 8, 19)).padStart(2, "0")}:${pick(rng, ["00", "15", "30", "45"])}`;
      if (key === "range") return `${intBetween(rng, 3, 8)} - ${intBetween(rng, 9, 16)}`;
      if (key === "value") return `${intBetween(rng, 4, 15)}.${intBetween(rng, 0, 9)}`;
      return `${pick(rng, words)} ${label} ${index + 1}`;
    }
  }
}

const cache = new Map<string, Row[]>();

export function buildRows(mod: ModulePageDef): Row[] {
  const cached = cache.get(mod.path);
  if (cached) return cached;
  const count = mod.rowCount ?? 24;
  const rng = seeded(hashString(mod.path));
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const row: Row = { id: `${mod.path}-${i + 1}` };
    for (const c of mod.columns) row[c.key] = valueFor(c, rng, i, mod.singular);
    rows.push(row);
  }
  cache.set(mod.path, rows);
  return rows;
}

export function buildChartData(categories: string[], keys: string[], seedKey: string) {
  const rng = seeded(hashString(seedKey));
  return categories.map((c) => {
    const point: Record<string, string | number> = { name: c };
    keys.forEach((k) => {
      point[k] = intBetween(rng, 40, 460);
    });
    return point;
  });
}
