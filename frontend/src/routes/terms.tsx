import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { usePlatformSite } from "@/lib/platformSite";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MediUnivers" },
      { name: "description", content: "The terms that govern using the MediUnivers platform." },
    ],
  }),
  component: TermsPage,
});

function TermsBody() {
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
        ) : site?.termsContent ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {site.termsContent}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Our terms of service are being finalized — please check back soon.
          </p>
        )}
      </Card>
    </section>
  );
}

function TermsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="The agreement between you and MediUnivers when you use our platform."
      />
      <TermsBody />
    </SiteLayout>
  );
}
