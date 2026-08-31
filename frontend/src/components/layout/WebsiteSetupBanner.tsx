import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WebsiteConfigStatus {
  published: boolean;
}

/**
 * Req #12: when a tenant's plan includes the website module, offer to set
 * up their organization website the moment they land on the dashboard —
 * until they've published one. GET /api/org/website/config auto-creates a
 * default (unpublished) row on first call, so "not published yet" is a
 * reliable signal without any extra backend endpoint.
 */
export function WebsiteSetupBanner() {
  const { isPlatform, canAccess } = usePermissions();
  const [published, setPublished] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const hasWebsiteModule = !isPlatform && canAccess("cms");

  useEffect(() => {
    if (!hasWebsiteModule) return;
    apiFetch<WebsiteConfigStatus>("/api/org/website/config")
      .then((config) => setPublished(config.published))
      .catch(() => setPublished(null));
  }, [hasWebsiteModule]);

  if (!hasWebsiteModule || dismissed || published !== false) return null;

  return (
    <Card className="flex flex-col gap-3 border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Globe className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Your plan includes a website</p>
          <p className="text-xs text-muted-foreground">
            Choose a template, add your logo and banner, and go live — appointment booking is built
            in.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm">
          <Link to="/app/cms/branding">Set up website</Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
