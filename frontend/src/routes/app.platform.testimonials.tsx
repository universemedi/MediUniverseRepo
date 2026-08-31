import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Quote, ShieldAlert, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import type { PlatformTestimonialDto } from "@/lib/types";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/app/platform/testimonials")({
  head: () => ({
    meta: [
      { title: "Testimonials — MediUnivers Platform" },
      { name: "description", content: "Customer quotes shown on MediUnivers' own public website." },
    ],
  }),
  component: TestimonialsPage,
});

interface FormState {
  name: string;
  roleCompany: string;
  message: string;
  rating: string;
  photoUrl: string;
  sortOrder: string;
  published: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  roleCompany: "",
  message: "",
  rating: "5",
  photoUrl: "",
  sortOrder: "0",
  published: true,
};

function toForm(t: PlatformTestimonialDto): FormState {
  return {
    name: t.name,
    roleCompany: t.roleCompany ?? "",
    message: t.message,
    rating: String(t.rating),
    photoUrl: t.photoUrl ?? "",
    sortOrder: String(t.sortOrder),
    published: t.published,
  };
}

function validateField(key: keyof FormState, f: FormState): string | undefined {
  switch (key) {
    case "name":
      return f.name.trim() ? undefined : "Name is required.";
    case "message":
      return f.message.trim() ? undefined : "Message is required.";
    default:
      return undefined;
  }
}

const VALIDATED_FIELDS: (keyof FormState)[] = ["name", "message"];

function validateAll(f: FormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of VALIDATED_FIELDS) {
    const message = validateField(key, f);
    if (message) errors[key] = message;
  }
  return errors;
}

function TestimonialsPage() {
  const { isPlatform } = usePermissions();

  const [items, setItems] = useState<PlatformTestimonialDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTestimonialDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [deleting, setDeleting] = useState<PlatformTestimonialDto | null>(null);

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
    apiFetch<PlatformTestimonialDto[]>("/api/platform/website-content/testimonials")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load testimonials."),
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

  function openEdit(t: PlatformTestimonialDto) {
    setEditing(t);
    setForm(toForm(t));
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
      name: form.name.trim(),
      roleCompany: form.roleCompany.trim() || null,
      message: form.message.trim(),
      rating: Number(form.rating) || 5,
      photoUrl: form.photoUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      published: form.published,
    };

    try {
      if (editing) {
        await apiFetch(`/api/platform/website-content/testimonials/${editing.id}`, {
          method: "PUT",
          data: payload,
        });
        toast.success("Testimonial updated");
      } else {
        await apiFetch("/api/platform/website-content/testimonials", {
          method: "POST",
          data: payload,
        });
        toast.success("Testimonial created");
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this testimonial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/platform/website-content/testimonials/${deleting.id}`, {
        method: "DELETE",
      });
      toast.success("Testimonial deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this testimonial.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer quotes shown on MediUnivers' own public website.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New testimonial
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !items ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Quote className="mx-auto mb-2 h-6 w-6" /> No testimonials yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((t) => (
            <Card
              key={t.id}
              className={cn("flex flex-col gap-2 p-4", !t.published && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">{t.name}</p>
                  {t.roleCompany ? (
                    <p className="text-[11px] text-muted-foreground">{t.roleCompany}</p>
                  ) : null}
                </div>
                {!t.published ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    Draft
                  </span>
                ) : null}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                    )}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">"{t.message}"</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleting(t)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit testimonial" : "New testimonial"}</DialogTitle>
            <DialogDescription>Shown on the public Testimonials page.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="t-name">
                  Name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="t-name"
                  ref={(el) => {
                    fieldRefs.current.name = el;
                  }}
                  value={form.name}
                  aria-invalid={!!(touched.name && fieldErrors.name)}
                  className={cn(
                    touched.name &&
                      fieldErrors.name &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                />
                {touched.name && fieldErrors.name ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.name}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-role">Role / company</Label>
                <Input
                  id="t-role"
                  value={form.roleCompany}
                  onChange={(e) => setField("roleCompany", e.target.value)}
                  placeholder="Owner, Sunrise Clinic"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="t-message">
                  Message<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Textarea
                  id="t-message"
                  ref={(el) => {
                    fieldRefs.current.message = el;
                  }}
                  rows={3}
                  value={form.message}
                  aria-invalid={!!(touched.message && fieldErrors.message)}
                  className={cn(
                    touched.message &&
                      fieldErrors.message &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setField("message", e.target.value)}
                  onBlur={() => handleBlur("message")}
                />
                {touched.message && fieldErrors.message ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-rating">Rating</Label>
                <Select value={form.rating} onValueChange={(v) => setField("rating", v)}>
                  <SelectTrigger id="t-rating">
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
              <div className="space-y-1.5">
                <Label htmlFor="t-sort">Sort order</Label>
                <Input
                  id="t-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setField("sortOrder", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="Photo"
                  value={form.photoUrl || null}
                  onChange={(url) => setField("photoUrl", url ?? "")}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="t-published" className="text-sm">
                Published (visible on the public site)
              </Label>
              <Switch
                id="t-published"
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
                {submitting ? "Saving…" : editing ? "Save changes" : "Create testimonial"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear on the public Testimonials page. This can't be undone.
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
