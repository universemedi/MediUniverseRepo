import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Images, Lock, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/cms/gallery")({
  head: () => ({
    meta: [
      { title: "Website Gallery — MediUnivers" },
      { name: "description", content: "Photos shown on your public website." },
    ],
  }),
  component: GalleryPage,
});

interface Image {
  id: number;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

function GalleryPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("cms");

  const [images, setImages] = useState<Image[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (isPlatform || unavailable) return;
    apiFetch<Image[]>("/api/org/website/gallery")
      .then(setImages)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load the gallery."),
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
    if (!imageUrl.trim()) return setError("Image URL is required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/org/website/gallery", {
        method: "POST",
        data: { imageUrl: imageUrl.trim(), caption: caption.trim() || null },
      });
      toast.success("Image added");
      setOpen(false);
      setImageUrl("");
      setCaption("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add this image.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(img: Image) {
    try {
      await apiFetch(`/api/org/website/gallery/${img.id}`, { method: "DELETE" });
      toast.success("Image removed");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove this image.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Website Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos shown on your public site's Gallery page.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add image
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !images ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Images className="mx-auto mb-2 h-6 w-6" /> No photos yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <img
                src={img.imageUrl}
                alt={img.caption ?? ""}
                className="h-32 w-full object-cover"
              />
              <div className="flex items-center justify-between p-2">
                <p className="truncate text-xs text-muted-foreground">{img.caption ?? "—"}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remove(img)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a photo</DialogTitle>
            <DialogDescription>
              Paste an image URL — file uploads aren't supported yet.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Caption</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
