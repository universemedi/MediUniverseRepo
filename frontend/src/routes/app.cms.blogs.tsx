import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Newspaper, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/cms/blogs")({
  head: () => ({
    meta: [
      { title: "Blog — MediUnivers Website" },
      { name: "description", content: "Blog posts published on your public website." },
    ],
  }),
  component: BlogsPage,
});

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  published: boolean;
  createdAt: string;
}

function BlogsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("cms");

  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (isPlatform || unavailable) return;
    apiFetch<BlogPost[]>("/api/org/website/blogs")
      .then(setPosts)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load blog posts."),
      );
  }
  useEffect(load, [isPlatform, unavailable]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }
  if (unavailable) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">
          Website Builder isn't part of this organization
        </h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return setError("Title and content are required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/org/website/blogs", {
        method: "POST",
        data: {
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          published,
        },
      });
      toast.success(published ? "Post published" : "Draft saved");
      setOpen(false);
      setTitle("");
      setExcerpt("");
      setContent("");
      setPublished(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts published on your public website.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !posts ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Newspaper className="mx-auto mb-2 h-6 w-6" /> No posts yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                {p.excerpt ? (
                  <p className="truncate text-xs text-muted-foreground">{p.excerpt}</p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={
                  p.published
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "text-muted-foreground"
                }
              >
                {p.published ? "Published" : "Draft"}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New blog post</DialogTitle>
            <DialogDescription>
              A URL-friendly slug is generated from the title automatically.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Excerpt</Label>
              <Input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One-line summary for the blog list"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={published} onCheckedChange={(v) => setPublished(!!v)} />
              Publish immediately
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : published ? "Publish" : "Save draft"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
