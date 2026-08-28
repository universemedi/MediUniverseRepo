import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/site/$slug/blog/$blogSlug")({
  head: () => ({ meta: [{ title: "Loading post…" }] }),
  component: BlogPostPage,
});

interface Post {
  title: string;
  content: string;
  coverImageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
}

function BlogPostPage() {
  const { slug, blogSlug } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiFetch<Post>(`/api/public/site/${slug}/blog/${blogSlug}`)
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [slug, blogSlug]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">This post isn't available</h1>
          <Link
            to="/site/$slug"
            params={{ slug }}
            className="mt-3 inline-block text-sm text-primary underline"
          >
            Back to the site
          </Link>
        </div>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          to="/site/$slug"
          params={{ slug }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mt-6 h-64 w-full rounded-xl object-cover"
          />
        ) : null}
        <h1 className="mt-6 text-3xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-2 text-xs text-slate-500">
          {post.author ? `${post.author} · ` : ""}
          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
        </p>
        <div className="prose prose-slate mt-6 whitespace-pre-line leading-relaxed">
          {post.content}
        </div>
      </div>
    </div>
  );
}
