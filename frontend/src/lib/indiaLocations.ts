import { useEffect, useState } from "react";
import { apiFetchPublic } from "@/lib/api";

/** Country → State → City cascade, backed by the real `/api/public/locations/*`
 * endpoints instead of a bundled dataset — India's full city catalog runs into
 * the thousands, too large to ship in the frontend bundle on every page load. */
export const COUNTRIES = ["India"] as const;

let statesCache: Promise<string[]> | null = null;

/** Fetched once and cached for the life of the page — every cascading-select consumer shares it. */
export function fetchIndiaStates(): Promise<string[]> {
  if (!statesCache) {
    statesCache = apiFetchPublic<string[]>("/api/public/locations/states").catch((err) => {
      statesCache = null;
      throw err;
    });
  }
  return statesCache;
}

const cityCache = new Map<string, Promise<string[]>>();

/** Cached per state so re-selecting the same state (or two fields needing the same state) doesn't refetch. */
export function fetchIndiaCities(state: string): Promise<string[]> {
  if (!state) return Promise.resolve([]);
  if (!cityCache.has(state)) {
    cityCache.set(
      state,
      apiFetchPublic<string[]>("/api/public/locations/cities", { params: { state } }).catch(
        (err) => {
          cityCache.delete(state);
          throw err;
        },
      ),
    );
  }
  return cityCache.get(state)!;
}

/** The state dropdown's options — same shape as any other synchronous `col()` option list. */
export function useIndiaStates(): string[] {
  const [states, setStates] = useState<string[]>([]);
  useEffect(() => {
    fetchIndiaStates()
      .then(setStates)
      .catch(() => setStates([]));
  }, []);
  return states;
}
