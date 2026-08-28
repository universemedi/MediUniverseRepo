import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Plus, Quote, ShieldAlert, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/cms/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials — MediUnivers" },
      { name: "description", content: "Patient testimonials shown on your public website." },
    ],
  }),
  component: TestimonialsPage,
});

interface Testimonial {
  id: number;
  patientName: string;
  message: string;
  rating: number;
  photoUrl: string | null;
  sortOrder: number;
  published: boolean;
}

function TestimonialsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("cms");

  const [items, setItems] = useState<Testimonial[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (isPlatform || unavailable) return;
    apiFetch<Testimonial[]>("/api/org/website/testimonials")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load testimonials."),
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
    if (!patientName.trim() || !message.trim()) return setError("Name and message are required.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/org/website/testimonials", {
        method: "POST",
        data: {
          patientName: patientName.trim(),
          message: message.trim(),
          rating: Number(rating),
          published: true,
        },
      });
      toast.success("Testimonial added");
      setOpen(false);
      setPatientName("");
      setMessage("");
      setRating("5");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add this testimonial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(t: Testimonial) {
    try {
      await apiFetch(`/api/org/website/testimonials/${t.id}`, { method: "DELETE" });
      toast.success("Testimonial removed");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove this testimonial.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patient quotes shown on your public website.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add testimonial
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !items ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Quote className="mx-auto mb-2 h-6 w-6" /> No testimonials yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.patientName}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remove(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">"{t.message}"</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a testimonial</DialogTitle>
            <DialogDescription>Shown on your public Testimonials section.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label>Patient name</Label>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} star{r > 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
