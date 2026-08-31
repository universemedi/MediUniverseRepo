import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { apiFetchPublic, ApiError } from "@/lib/api";
import { resolveIcon } from "@/lib/iconMap";
import type { PlatformContentCardDto } from "@/lib/types";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Clinic, Pharmacy, Lab, CRM & CMS | MediUnivers" },
      {
        name: "description",
        content:
          "Explore MediUnivers modules: appointments and queue, pharmacy inventory, laboratory workflows, patient CRM, website builder and role-based access control.",
      },
      { property: "og:title", content: "MediUnivers Features" },
      {
        property: "og:description",
        content: "Every module of the MediUnivers healthcare platform in detail.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const [items, setItems] = useState<PlatformContentCardDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformContentCardDto[]>(
      "/api/public/platform-site/content-cards?section=FEATURE",
    )
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load features."),
      );
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Features"
        title="One platform, every healthcare workflow"
        subtitle="Modules are switched on by subscription plan, so each organization only sees what it pays for."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        {loadError ? (
          <Card className="p-4 text-center text-sm text-destructive">{loadError}</Card>
        ) : !items ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            <LayoutGrid className="mx-auto mb-2 h-6 w-6" /> Feature list coming soon.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((g) => {
              const Icon = resolveIcon(g.icon);
              const lines = (g.bulletsText ?? "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              return (
                <Card key={g.id} className="p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-foreground">{g.title}</h2>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {lines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
