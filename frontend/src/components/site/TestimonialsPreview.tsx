import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Quote, Star } from "lucide-react";
import { apiFetchPublic, resolveUploadUrl } from "@/lib/api";
import type { PlatformTestimonialDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** A three-up preview of the real, published testimonial catalog — shared by the Pricing page
 * and the Home page, with a link through to the full /testimonials page. */
export function TestimonialsPreview() {
  const [items, setItems] = useState<PlatformTestimonialDto[] | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformTestimonialDto[]>("/api/public/platform-site/testimonials")
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items && items.length === 0) return null;

  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            What our customers say
          </h2>
          <Button asChild variant="outline">
            <Link to="/testimonials">See all testimonials</Link>
          </Button>
        </div>

        {!items ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 3).map((t) => (
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
      </div>
    </section>
  );
}
