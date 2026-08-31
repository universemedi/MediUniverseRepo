import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { usePlatformSite } from "@/lib/platformSite";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MediUnivers" },
      { name: "description", content: "How MediUnivers collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyBody() {
  const { site, loading } = usePlatformSite();

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <Card className="p-6 sm:p-10">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        ) : site?.privacyContent ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {site.privacyContent}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Our privacy policy is being finalized — please check back soon.
          </p>
        )}
      </Card>
    </section>
  );
}

function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="What we collect, why, and how you stay in control of your data."
      />
      <PrivacyBody />
    </SiteLayout>
  );
}
