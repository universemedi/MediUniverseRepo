import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { apiFetchPublic, ApiError } from "@/lib/api";
import { resolveIcon } from "@/lib/iconMap";
import { usePlatformSite } from "@/lib/platformSite";
import type { PlatformContentCardDto } from "@/lib/types";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About MediUnivers — The Team Behind the Platform" },
      {
        name: "description",
        content:
          "MediUnivers builds and operates a multi-tenant healthcare platform. Learn about our mission, how subscriptions work and the teams that support every organization.",
      },
      { property: "og:title", content: "About MediUnivers" },
      {
        property: "og:description",
        content: "Our mission, our product model and how we support subscribed organizations.",
      },
    ],
  }),
  component: AboutPage,
});

const DEFAULT_MISSION = `Healthcare teams lose hours every day to registers, spreadsheets and disconnected software. MediUnivers replaces that with one console where appointments, prescriptions, inventory, lab results, billing and the organization's public website all share the same data.

Organizations request a demo, choose a plan and get exactly the modules that plan unlocks. From there the organization's own administrator creates roles for doctors, reception, pharmacists, lab technicians and accountants — so every staff member logs in to a workspace built around their job.`;

function AboutBody() {
  const { site } = usePlatformSite();
  const [values, setValues] = useState<PlatformContentCardDto[] | null>(null);
  const [teams, setTeams] = useState<PlatformContentCardDto[] | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformContentCardDto[]>(
      "/api/public/platform-site/content-cards?section=VALUE",
    )
      .then(setValues)
      .catch(() => setValues([]));
    apiFetchPublic<PlatformContentCardDto[]>("/api/public/platform-site/content-cards?section=TEAM")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const missionParagraphs = (site?.missionContent || DEFAULT_MISSION)
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Our mission</h2>
          {missionParagraphs.map((p) => (
            <p key={p} className="mt-3 text-sm text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {!values ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : values.length === 0 ? (
            <Card className="col-span-2 p-6 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-5 w-5" /> Coming soon.
            </Card>
          ) : (
            values.map((v) => {
              const Icon = resolveIcon(v.icon);
              return (
                <Card key={v.id} className="p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{v.title}</h3>
                  {v.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </div>

      <h2 className="mt-16 text-xl font-semibold tracking-tight text-foreground">
        Teams behind MediUnivers
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!teams ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : teams.length === 0 ? (
          <Card className="col-span-4 p-6 text-center text-sm text-muted-foreground">
            Coming soon.
          </Card>
        ) : (
          teams.map((t) => (
            <Card key={t.id} className="p-5">
              <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
              {t.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              ) : null}
            </Card>
          ))
        )}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/request-demo">Request a demo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/contact">Contact us</Link>
        </Button>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About us"
        title="We build the platform. You run the care."
        subtitle="MediUnivers is the product owner of a multi-tenant healthcare SaaS used by clinics, pharmacies and laboratories."
        bannerKey="about"
      />
      <AboutBody />
    </SiteLayout>
  );
}
