import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Newspaper } from "lucide-react";
import { apiFetchPublic, ApiError, resolveUploadUrl } from "@/lib/api";
import type { PlatformBlogPostDto } from "@/lib/types";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Healthcare Operations Insights | MediUnivers" },
      {
        name: "description",
        content:
          "Practical articles on clinic queue management, pharmacy stock control, lab turnaround time and growing a healthcare practice.",
      },
      { property: "og:title", content: "MediUnivers Blog" },
      {
        property: "og:description",
        content: "Insights on running clinics, pharmacies and diagnostic labs.",
      },
    ],
  }),
  component: BlogPage,
});

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BlogPage() {
  const [items, setItems] = useState<PlatformBlogPostDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetchPublic<PlatformBlogPostDto[]>("/api/public/platform-site/blog")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load blog posts."),
      );
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Blog"
        title="Ideas for running a better practice"
        subtitle="Operational playbooks from the teams building and using MediUnivers."
        bannerKey="blog"
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
            <Newspaper className="mx-auto mb-2 h-6 w-6" /> No articles published yet.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="block">
                <Card className="flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
                  {p.coverImageUrl ? (
                    <img
                      src={resolveUploadUrl(p.coverImageUrl)}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-base font-semibold text-foreground">{p.title}</h2>
                    {p.excerpt ? (
                      <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
                    ) : null}
                    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />{" "}
                      {formatDate(p.publishedAt ?? p.createdAt)}
                      {p.author ? ` · ${p.author}` : ""}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Button asChild variant="outline">
            <Link to="/contact">Suggest a topic</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
