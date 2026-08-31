import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { PlatformBlogPostDto } from "@/lib/types";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/platform/blog")({
  head: () => ({
    meta: [
      { title: "Blog — MediUnivers Platform" },
      { name: "description", content: "Articles published on MediUnivers' own public website." },
    ],
  }),
  component: BlogPage,
});

interface FormState {
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  author: string;
  published: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  title: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  author: "",
  published: false,
};

function toForm(p: PlatformBlogPostDto): FormState {
  return {
    title: p.title,
    excerpt: p.excerpt ?? "",
    content: p.content,
    coverImageUrl: p.coverImageUrl ?? "",
    author: p.author ?? "",
    published: p.published,
  };
}

function validateField(key: keyof FormState, f: FormState): string | undefined {
  switch (key) {
    case "title":
      return f.title.trim() ? undefined : "Title is required.";
    case "content":
      return f.content.trim() ? undefined : "Content is required.";
    default:
      return undefined;
  }
}

const VALIDATED_FIELDS: (keyof FormState)[] = ["title", "content"];

function validateAll(f: FormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of VALIDATED_FIELDS) {
    const message = validateField(key, f);
    if (message) errors[key] = message;
  }
  return errors;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BlogPage() {
  const { isPlatform } = usePermissions();

  const [items, setItems] = useState<PlatformBlogPostDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformBlogPostDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [deleting, setDeleting] = useState<PlatformBlogPostDto | null>(null);

  const fieldRefs = useRef<
    Partial<Record<keyof FormState, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});

  function setField(key: keyof FormState, value: FormState[typeof key]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (touched[key]) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, [key]: validateField(key, next) }));
      }
      return next;
    });
  }

  function handleBlur(key: keyof FormState) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateField(key, form) }));
  }

  function load() {
    if (!isPlatform) return;
    apiFetch<PlatformBlogPostDto[]>("/api/platform/website-content/blog")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load blog posts."),
      );
  }
  useEffect(load, [isPlatform]);

  if (!isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Platform area</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFieldErrors({});
    setTouched({});
    setOpen(true);
  }

  function openEdit(p: PlatformBlogPostDto) {
    setEditing(p);
    setForm(toForm(p));
    setError(null);
    setFieldErrors({});
    setTouched({});
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateAll(form);
    setFieldErrors(errors);
    setTouched(Object.fromEntries(VALIDATED_FIELDS.map((k) => [k, true])));

    const firstInvalid = VALIDATED_FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      coverImageUrl: form.coverImageUrl.trim() || null,
      author: form.author.trim() || null,
      published: form.published,
    };

    try {
      if (editing) {
        await apiFetch(`/api/platform/website-content/blog/${editing.id}`, {
          method: "PUT",
          data: payload,
        });
        toast.success("Blog post updated");
      } else {
        await apiFetch("/api/platform/website-content/blog", { method: "POST", data: payload });
        toast.success("Blog post created");
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this blog post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/platform/website-content/blog/${deleting.id}`, { method: "DELETE" });
      toast.success("Blog post deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this blog post.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Articles published on MediUnivers' own public website.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !items ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Newspaper className="mx-auto mb-2 h-6 w-6" /> No blog posts yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <Badge variant="outline" className={cn(!p.published && "text-muted-foreground")}>
                    {p.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  /{p.slug} · {p.author ?? "No author"} · {formatDate(p.publishedAt ?? p.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleting(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit blog post" : "New blog post"}</DialogTitle>
            <DialogDescription>Shown on the public Blog page.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="b-title">
                Title<span className="ml-1 font-bold text-destructive">*</span>
              </Label>
              <Input
                id="b-title"
                ref={(el) => {
                  fieldRefs.current.title = el;
                }}
                value={form.title}
                aria-invalid={!!(touched.title && fieldErrors.title)}
                className={cn(
                  touched.title &&
                    fieldErrors.title &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                onChange={(e) => setField("title", e.target.value)}
                onBlur={() => handleBlur("title")}
              />
              {touched.title && fieldErrors.title ? (
                <p className="text-xs font-medium text-destructive">{fieldErrors.title}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="b-author">Author</Label>
                <Input
                  id="b-author"
                  value={form.author}
                  onChange={(e) => setField("author", e.target.value)}
                />
              </div>
              <ImageUploadField
                label="Cover image"
                value={form.coverImageUrl || null}
                onChange={(url) => setField("coverImageUrl", url ?? "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-excerpt">Excerpt</Label>
              <Textarea
                id="b-excerpt"
                rows={2}
                value={form.excerpt}
                onChange={(e) => setField("excerpt", e.target.value)}
                placeholder="Shown in the blog list preview."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-content">
                Content<span className="ml-1 font-bold text-destructive">*</span>
              </Label>
              <Textarea
                id="b-content"
                ref={(el) => {
                  fieldRefs.current.content = el;
                }}
                rows={10}
                value={form.content}
                aria-invalid={!!(touched.content && fieldErrors.content)}
                className={cn(
                  touched.content &&
                    fieldErrors.content &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                onChange={(e) => setField("content", e.target.value)}
                onBlur={() => handleBlur("content")}
              />
              {touched.content && fieldErrors.content ? (
                <p className="text-xs font-medium text-destructive">{fieldErrors.content}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="b-published" className="text-sm">
                Published (visible on the public site)
              </Label>
              <Switch
                id="b-published"
                checked={form.published}
                onCheckedChange={(v) => setField("published", v)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create post"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear on the public Blog page. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
