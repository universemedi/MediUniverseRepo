import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  FlaskConical,
  Globe,
  Pill,
  ShieldCheck,
  Target,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PlanAddonPicker } from "@/components/site/PlanAddonPicker";
import { TestimonialsPreview } from "@/components/site/TestimonialsPreview";
import { resolveUploadUrl } from "@/lib/api";
import { usePlatformSite } from "@/lib/platformSite";
import { useDynamicSeo } from "@/lib/useDynamicSeo";
import { cn } from "@/lib/utils";
import { HeroCarousel } from "@/components/common/HeroCarousel";
import { useOrgDomainRedirect } from "@/lib/orgDomain";
import type { PlatformSiteStat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function parseImageArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediUnivers — Healthcare SaaS for Clinics, Pharmacies & Labs" },
      {
        name: "description",
        content:
          "MediUnivers unifies appointments, billing, pharmacy inventory, lab workflows, CRM and a website builder in one role-based healthcare platform.",
      },
      { property: "og:title", content: "MediUnivers — Healthcare SaaS Platform" },
      {
        property: "og:description",
        content:
          "Appointments, pharmacy, laboratory, CRM and CMS in one multi-tenant healthcare console.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Clinic operations",
    body: "Patients, appointments, live queue, consultation and billing in one flow.",
  },
  {
    icon: Pill,
    title: "Pharmacy",
    body: "Medicine master, suppliers, batch stock, expiry alerts and counter sales.",
  },
  {
    icon: FlaskConical,
    title: "Laboratory",
    body: "Test catalogue, sample tracking, result entry and doctor review.",
  },
  {
    icon: Target,
    title: "Patient CRM",
    body: "Lead sources, follow-ups and conversions from enquiry to appointment.",
  },
  {
    icon: Globe,
    title: "Website & CMS",
    body: "Every organization gets a themeable public site with online booking.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    body: "Platform, organization and patient portals with custom org roles.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Request a demo",
    body: "Our sales team reviews your enquiry and walks you through the product.",
  },
  {
    step: "02",
    title: "Pick a plan",
    body: "Start on a free trial, then subscribe to Starter, Professional or Enterprise.",
  },
  {
    step: "03",
    title: "Onboard your org",
    body: "Add clinics, branches, departments and invite your team.",
  },
  {
    step: "04",
    title: "Create your roles",
    body: "Doctors, reception, pharmacists and lab staff get exactly the pages they need.",
  },
];

/** Rendered inside <SiteLayout>, which is what actually provides usePlatformSite()'s context. */
function HomeSeo() {
  const { site } = usePlatformSite();
  useDynamicSeo(site?.seoTitle, site?.seoDescription);
  return null;
}

const DEFAULT_HERO_STATS: PlatformSiteStat[] = [
  { label: "Organizations", value: "480+" },
  { label: "Core modules", value: "6" },
  { label: "Built-in roles", value: "14" },
  { label: "Uptime target", value: "99.9%" },
];

/** Also rendered inside <SiteLayout> for the same reason as HomeSeo — usePlatformSite needs the site-config context. */
function HomeHero() {
  const { site, stats } = usePlatformSite();
  const heroStats = stats.length ? stats : DEFAULT_HERO_STATS;
  const carouselImages = parseImageArray(site?.homeCarouselJson).map(resolveUploadUrl);
  const hasCarousel = carouselImages.length > 0;
  const videoUrl = site?.heroVideoUrl ? resolveUploadUrl(site.heroVideoUrl) : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border",
        hasCarousel ? "bg-slate-900" : "bg-primary/5",
      )}
    >
      {hasCarousel ? (
        <>
          <HeroCarousel images={carouselImages} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/65 to-slate-950/85" />
        </>
      ) : null}
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center">
        <Badge
          variant="outline"
          className={
            hasCarousel
              ? "border-white/30 bg-white/10 text-white"
              : "border-primary/25 bg-primary/10 text-primary"
          }
        >
          Multi-tenant healthcare SaaS
        </Badge>
        <h1
          className={cn(
            "mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl",
            hasCarousel ? "text-white" : "text-foreground",
          )}
        >
          {site?.heroHeading || "Run clinics, pharmacies and laboratories from a single console"}
        </h1>
        <p
          className={cn(
            "mx-auto mt-4 max-w-2xl text-base",
            hasCarousel ? "text-white/85" : "text-muted-foreground",
          )}
        >
          {site?.heroSubheading ||
            "MediUnivers brings appointments, queue management, billing, inventory, lab workflows, CRM and your public website together — with granular role-based access for every team member."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/free-trial">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/request-demo">Request a demo</Link>
          </Button>
        </div>
        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {heroStats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <dt className="text-xl font-semibold text-foreground">{s.value}</dt>
              <dd className="text-xs text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
      {videoUrl ? (
        <div className="relative mx-auto max-w-3xl px-4 pb-16">
          <video
            src={videoUrl}
            controls
            className="w-full rounded-xl border border-border/60 shadow-lg"
          />
        </div>
      ) : null}
    </section>
  );
}

function Landing() {
  const checkingOrgDomain = useOrgDomainRedirect();

  // Landing on an org's own domain resolves to their site instead — render nothing while that
  // lookup is in flight so the MediUnivers homepage never flashes before the redirect.
  if (checkingOrgDomain) return null;

  return (
    <SiteLayout>
      <HomeSeo />
      <HomeHero />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Everything a healthcare group needs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Modules unlock according to the plan the organization subscribes to.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6 transition-shadow hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            How onboarding works
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-lg border border-border bg-background p-5">
                <span className="text-xs font-semibold text-primary">{s.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 pt-16">
        <Button asChild variant="outline">
          <Link to="/pricing">See full pricing</Link>
        </Button>
      </div>
      <PlanAddonPicker />

      <TestimonialsPreview />

      <section className="border-t border-border bg-primary/5">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Ready to see MediUnivers in action?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Book a guided demo with our team or start a 14-day free trial today.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/request-demo">Request a demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/free-trial">Start free trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
