import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Quote, Star } from "lucide-react";
import { apiFetchPublic, ApiError, resolveUploadUrl } from "@/lib/api";
import type { PlatformTestimonialDto } from "@/lib/types";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/testimonials")({
  head: () => ({
    meta: [
      { title: "Customer Stories & Testimonials | MediUnivers" },
      {
        name: "description",
        content:
          "Read how clinics, pharmacy chains and diagnostic labs run daily operations on MediUnivers — in their own words.",
      },
      { property: "og:title", content: "MediUnivers Testimonials" },
      {
        property: "og:description",
        content: "Customer stories from clinics, pharmacies and laboratories.",
      },
    ],
  }),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const [items, setItems] = useState<PlatformTestimonialDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformTestimonialDto[]>("/api/public/platform-site/testimonials")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load testimonials."),
      );
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Testimonials"
        title="Trusted by clinics, pharmacies and labs"
        subtitle="Real workflows, real teams — here is what organizations say after moving to MediUnivers."
        bannerKey="testimonials"
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
            <Quote className="mx-auto mb-2 h-6 w-6" /> No testimonials published yet.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <Card key={t.id} className="flex flex-col p-6">
                <Quote className="h-6 w-6 text-primary/40" />
                <p className="mt-3 flex-1 text-sm text-foreground">"{t.message}"</p>
                <div className="mt-4 flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < t.rating ? "fill-current" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                  {t.photoUrl ? (
                    <img
                      src={resolveUploadUrl(t.photoUrl)}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    {t.roleCompany ? (
                      <p className="text-xs text-muted-foreground">{t.roleCompany}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Button asChild>
            <Link to="/request-demo">Request a demo</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
