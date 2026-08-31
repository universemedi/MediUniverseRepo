import { intBetween, seeded } from "./mock";

export type Row = Record<string, string | number> & { id: string };

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic placeholder trend data for the dashboard's charts — see the "dashboard charts/stats are still mock" finding. */
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
