import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetchPublic } from "@/lib/api";
import type { PlatformSiteConfigDto, PlatformSiteStat } from "@/lib/types";

interface PlatformSiteContextValue {
  site: PlatformSiteConfigDto | null;
  stats: PlatformSiteStat[];
  loading: boolean;
}

const PlatformSiteContext = createContext<PlatformSiteContextValue>({
  site: null,
  stats: [],
  loading: true,
});

/** Module-level cache — every public page renders <SiteLayout> around its own content,
 * so without this every one of them would re-fetch the same site config on its own. */
let cached: PlatformSiteConfigDto | null = null;
let inflight: Promise<PlatformSiteConfigDto> | null = null;

function fetchPlatformSite(): Promise<PlatformSiteConfigDto> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = apiFetchPublic<PlatformSiteConfigDto>("/api/public/platform-site").then((data) => {
      cached = data;
      return data;
    });
  }
  return inflight;
}

function parseStats(json: string | null | undefined): PlatformSiteStat[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s): s is PlatformSiteStat =>
          !!s &&
          typeof s === "object" &&
          typeof s.label === "string" &&
          typeof s.value === "string",
      );
    }
  } catch {
    // malformed JSON — treat as no stats configured yet
  }
  return [];
}

/** Wraps every public marketing page (via SiteLayout) so the header, footer and page
 * content all share one fetch of MediUnivers' own site config instead of each fetching it. */
export function PlatformSiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<PlatformSiteConfigDto | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    fetchPlatformSite()
      .then((data) => {
        if (active) setSite(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PlatformSiteContext.Provider value={{ site, stats: parseStats(site?.statsJson), loading }}>
      {children}
    </PlatformSiteContext.Provider>
  );
}

export function usePlatformSite() {
  return useContext(PlatformSiteContext);
}
