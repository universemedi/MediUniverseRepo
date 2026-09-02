import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { apiFetchPublic } from "@/lib/api";

/**
 * Detects whether the app is being loaded on an organization's own domain instead of
 * MediUnivers' own — a real custom domain in production, or (for local testing) a hosts-file
 * entry like "sunrise.mediunivers.local" pointed at this dev server. When it is, the homepage
 * redirects straight to that org's public site instead of the MediUnivers marketing page —
 * "the org owner logs in through their own website" only makes sense once landing on it is
 * automatic; an org that hasn't published a site (or whose subdomain doesn't resolve) falls
 * straight through to the normal marketing homepage.
 */
const PLATFORM_HOSTS = new Set(["localhost", "127.0.0.1", "mediunivers.io", "mediunivers.com"]);

/** The label before ".mediunivers.<tld>" for a subdomain like "sunrise.mediunivers.io", or the
 * whole first label for a fully custom local test host like "sunrise.mediunivers.local". */
export function subdomainCandidate(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (PLATFORM_HOSTS.has(host)) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // bare IP — never a tenant domain

  const labels = host.split(".");
  if (labels.length < 2) return null; // a single-label host is never a tenant domain
  const candidate = labels[0];
  return candidate && candidate !== "www" ? candidate : null;
}

interface SlugOnly {
  slug: string;
}

export interface OrgBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  tagline: string | null;
}

interface SiteBrandingResponse {
  organizationName: string;
  config: {
    logoUrl: string | null;
    primaryColor: string;
    tagline: string | null;
  };
}

/** Call once from the marketing homepage. False on first paint (matching the server-rendered
 * marketing page) and permanently on a platform host; on a candidate domain it flips true right
 * after mount while the subdomain lookup is in flight (render nothing), then back to false if
 * the lookup fails, so the marketing page still renders as a safe fallback. */
export function useOrgDomainRedirect(): boolean {
  const navigate = useNavigate();
  // Starts false on both server and client (the server can't know the hostname here), so the
  // first client render matches the SSR-ed marketing page with no hydration mismatch; the effect
  // below flips it to true a moment later on a candidate domain, right before the redirect.
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const candidate = subdomainCandidate(window.location.hostname);
    if (!candidate) return;
    setChecking(true);

    let active = true;
    apiFetchPublic<SlugOnly>(`/api/public/site/by-subdomain/${candidate}`)
      .then((site) => {
        if (!active) return;
        void navigate({ to: "/site/$slug", params: { slug: site.slug }, replace: true });
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return checking;
}

/** Call once from the login page. On an org's own domain, resolves that org's name/logo/color
 * for a branded sign-in screen instead of MediUnivers' own — same two-pass SSR pattern as
 * {@link useOrgDomainRedirect}: `branding` starts null on both server and client so the first
 * client render matches the server-rendered generic panel, then fills in a moment later once the
 * lookup resolves (or stays null on a platform host, or if the lookup fails). */
export function useOrgBranding(): { loading: boolean; branding: OrgBranding | null } {
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<OrgBranding | null>(null);

  useEffect(() => {
    const candidate = subdomainCandidate(window.location.hostname);
    if (!candidate) return;
    setLoading(true);

    let active = true;
    apiFetchPublic<SiteBrandingResponse>(`/api/public/site/by-subdomain/${candidate}`)
      .then((site) => {
        if (!active) return;
        setBranding({
          name: site.organizationName,
          logoUrl: site.config.logoUrl,
          primaryColor: site.config.primaryColor,
          tagline: site.config.tagline,
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { loading, branding };
}
