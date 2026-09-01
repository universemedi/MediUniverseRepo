import { useEffect } from "react";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Applies the Super Admin's configured site title/description on top of the
 * route's static `head()` meta. TanStack Router's `head()` has no access to
 * data fetched client-side (this app has no SSR loaders), so this is the only
 * way the platform CMS's "SEO title" / "SEO description" fields can actually
 * reach the page — without it, those fields save but never affect anything.
 * Falls back to whatever `head()` already rendered when nothing is configured.
 */
export function useDynamicSeo(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (title) {
      document.title = title;
      upsertMeta("property", "og:title", title);
    }
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }
  }, [title, description]);
}
