import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { usePlatformSite } from "@/lib/platformSite";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — MediUnivers" },
      { name: "description", content: "How MediUnivers keeps your organization's data secure." },
    ],
  }),
  component: SecurityPage,
});

function SecurityBody() {
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
        ) : site?.securityContent ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {site.securityContent}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Our security overview is being finalized — please check back soon.
          </p>
        )}
      </Card>
    </section>
  );
}

function SecurityPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Legal"
        title="Security"
        subtitle="The practices we follow to keep every organization's data safe."
      />
      <SecurityBody />
    </SiteLayout>
  );
}
