import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { apiFetchPublic, ApiError } from "@/lib/api";
import type { PlatformContentCardDto } from "@/lib/types";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions for Clinics, Hospitals, Pharmacies & Labs | MediUnivers" },
      {
        name: "description",
        content:
          "MediUnivers solutions for single clinics, multi-branch hospital groups, retail pharmacies, diagnostic laboratories and polyclinics.",
      },
      { property: "og:title", content: "MediUnivers Solutions" },
      {
        property: "og:description",
        content: "Tailored healthcare workflows by organization type.",
      },
    ],
  }),
  component: SolutionsPage,
});

function SolutionsPage() {
  const [items, setItems] = useState<PlatformContentCardDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformContentCardDto[]>(
      "/api/public/platform-site/content-cards?section=SOLUTION",
    )
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load solutions."),
      );
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Solutions"
        title="Built for how your organization actually operates"
        subtitle="From a single-doctor clinic to a multi-branch hospital group with its own pharmacy and lab."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        {loadError ? (
          <Card className="p-4 text-center text-sm text-destructive">{loadError}</Card>
        ) : !items ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            <LayoutGrid className="mx-auto mb-2 h-6 w-6" /> Solutions coming soon.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => {
              const lines = (s.bulletsText ?? "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              return (
                <Card key={s.id} className="flex flex-col p-6">
                  {s.tag ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {s.tag}
                    </span>
                  ) : null}
                  <h2 className="mt-1 text-base font-semibold text-foreground">{s.title}</h2>
                  {s.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                  <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
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
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/request-demo">Request a demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">Compare plans</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
