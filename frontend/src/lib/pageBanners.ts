import { resolveUploadUrl } from "@/lib/api";
import { usePlatformSite } from "@/lib/platformSite";

export type PageBannerKey =
  "features" | "solutions" | "pricing" | "testimonials" | "blog" | "about" | "contact";

export const PAGE_BANNER_LABELS: Record<PageBannerKey, string> = {
  features: "Features",
  solutions: "Solutions",
  pricing: "Pricing",
  testimonials: "Testimonials",
  blog: "Blog",
  about: "About",
  contact: "Contact",
};

export type PageBanners = Partial<Record<PageBannerKey, string>>;

/** `PlatformWebsiteConfig.pageBannersJson` is a flat `{page: imageUrl}` map — same
 * small-object-as-JSON convention as bannersJson/statsJson on the same entity. */
export function parsePageBanners(json: string | null | undefined): PageBanners {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: PageBanners = {};
      for (const key of Object.keys(PAGE_BANNER_LABELS) as PageBannerKey[]) {
        const v = (parsed as Record<string, unknown>)[key];
        if (typeof v === "string" && v.trim()) out[key] = v;
      }
      return out;
    }
  } catch {
    // malformed JSON — treat as no banners configured yet
  }
  return {};
}

export function stringifyPageBanners(banners: PageBanners): string {
  return JSON.stringify(banners);
}

/** Resolves one page's configured hero banner to an absolute URL, or null when unset (or no key
 * given). Must be called from a component rendered inside <SiteLayout>, which provides the site config. */
export function usePageBanner(key: PageBannerKey | undefined): string | null {
  const { site } = usePlatformSite();
  const url = key ? parsePageBanners(site?.pageBannersJson)[key] : undefined;
  return url ? resolveUploadUrl(url) : null;
}
