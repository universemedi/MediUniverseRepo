import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { apiFetchPublic, ApiError, resolveUploadUrl } from "@/lib/api";
import type { PlatformBlogPostDto } from "@/lib/types";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BlogPostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<PlatformBlogPostDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    setLoadError(null);
    apiFetchPublic<PlatformBlogPostDto>(`/api/public/platform-site/blog/${slug}`)
      .then(setPost)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setLoadError(err instanceof ApiError ? err.message : "Couldn't load this article.");
      });
  }, [slug]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-14">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/blog">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
          </Link>
        </Button>

        {loadError ? (
          <Card className="p-4 text-sm text-destructive">{loadError}</Card>
        ) : notFound ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            This article doesn't exist or hasn't been published.
          </Card>
        ) : !post ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>
        ) : (
          <article>
            {post.coverImageUrl ? (
              <img
                src={resolveUploadUrl(post.coverImageUrl)}
                alt=""
                className="mb-6 h-64 w-full rounded-xl object-cover"
              />
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{post.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />{" "}
              {formatDate(post.publishedAt ?? post.createdAt)}
              {post.author ? ` · ${post.author}` : ""}
            </p>
            <div className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {post.content}
            </div>
          </article>
        )}
      </section>
    </SiteLayout>
  );
}
