import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutGrid, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/iconMap";
import type { PlatformContentCardDto, PlatformContentSection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/app/platform/content-cards")({
  head: () => ({
    meta: [
      { title: "Features & Solutions — MediUnivers Platform" },
      {
        name: "description",
        content: "Feature, solution and value cards shown on MediUnivers' own public website.",
      },
    ],
  }),
  component: ContentCardsPage,
});

const SECTIONS: {
  key: PlatformContentSection;
  label: string;
  hint: string;
  hasTag: boolean;
  hasDescription: boolean;
  bulletsLabel: string | null;
}[] = [
  {
    key: "FEATURE",
    label: "Features",
    hint: 'One card per feature group (e.g. "Clinic management") shown on the /features page — Items become its bullet list.',
    hasTag: false,
    hasDescription: false,
    bulletsLabel: "Items (one per line)",
  },
  {
    key: "SOLUTION",
    label: "Solutions",
    hint: "One card per organization type shown on the /solutions page — Tag shows the plan, Wins become its bullet list.",
    hasTag: true,
    hasDescription: true,
    bulletsLabel: "Wins (one per line)",
  },
  {
    key: "VALUE",
    label: "Our Values",
    hint: 'Shown in the "our values" grid on the /about page.',
    hasTag: false,
    hasDescription: true,
    bulletsLabel: null,
  },
  {
    key: "TEAM",
    label: "Team",
    hint: "Teams / departments shown on the /about page.",
    hasTag: false,
    hasDescription: true,
    bulletsLabel: null,
  },
];

interface FormState {
  icon: string;
  title: string;
  tag: string;
  description: string;
  bulletsText: string;
  sortOrder: string;
  published: boolean;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  icon: "",
  title: "",
  tag: "",
  description: "",
  bulletsText: "",
  sortOrder: "0",
  published: true,
};

function toForm(c: PlatformContentCardDto): FormState {
  return {
    icon: c.icon ?? "",
    title: c.title,
    tag: c.tag ?? "",
    description: c.description ?? "",
    bulletsText: c.bulletsText ?? "",
    sortOrder: String(c.sortOrder),
    published: c.published,
  };
}

function ContentCardsPage() {
  const { isPlatform } = usePermissions();
  const [section, setSection] = useState<PlatformContentSection>("FEATURE");
  const sectionDef = SECTIONS.find((s) => s.key === section)!;

  const [items, setItems] = useState<PlatformContentCardDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformContentCardDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [deleting, setDeleting] = useState<PlatformContentCardDto | null>(null);

  const titleRef = useRef<HTMLInputElement | null>(null);

  function load() {
    if (!isPlatform) return;
    setItems(null);
    apiFetch<PlatformContentCardDto[]>(
      `/api/platform/website-content/content-cards?section=${section}`,
    )
      .then(setItems)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load cards."));
  }
  useEffect(load, [isPlatform, section]);

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

  function openEdit(c: PlatformContentCardDto) {
    setEditing(c);
    setForm(toForm(c));
    setError(null);
    setFieldErrors({});
    setTouched({});
    setOpen(true);
  }

  function validate(): FieldErrors {
    return form.title.trim() ? {} : { title: "Title is required." };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setTouched({ title: true });
    if (errors.title) {
      titleRef.current?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);

    const payload = {
      section,
      icon: form.icon.trim() || null,
      title: form.title.trim(),
      tag: form.tag.trim() || null,
      description: form.description.trim() || null,
      bulletsText: form.bulletsText.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      published: form.published,
    };

    try {
      if (editing) {
        await apiFetch(`/api/platform/website-content/content-cards/${editing.id}`, {
          method: "PUT",
          data: payload,
        });
        toast.success("Card updated");
      } else {
        await apiFetch("/api/platform/website-content/content-cards", {
          method: "POST",
          data: payload,
        });
        toast.success("Card created");
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this card.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/platform/website-content/content-cards/${deleting.id}`, {
        method: "DELETE",
      });
      toast.success("Card deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this card.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Features & Solutions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sectionDef.hint}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New card
        </Button>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as PlatformContentSection)}>
        <TabsList>
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !items ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <LayoutGrid className="mx-auto mb-2 h-6 w-6" /> No {sectionDef.label.toLowerCase()} cards
          yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const Icon = resolveIcon(c.icon);
            return (
              <Card
                key={c.id}
                className={cn("flex flex-col gap-2 p-4", !c.published && "opacity-60")}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {!c.published ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      Draft
                    </span>
                  ) : null}
                </div>
                {c.tag ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {c.tag}
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                {c.description ? (
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                ) : null}
                {c.bulletsText ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {c.bulletsText
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {line}
                        </li>
                      ))}
                  </ul>
                ) : null}
                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleting(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${sectionDef.label.slice(0, -1)}`
                : `New ${sectionDef.label.slice(0, -1)}`}
            </DialogTitle>
            <DialogDescription>{sectionDef.hint}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-title">
                  Title<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="c-title"
                  ref={titleRef}
                  value={form.title}
                  aria-invalid={!!(touched.title && fieldErrors.title)}
                  className={cn(
                    touched.title &&
                      fieldErrors.title &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {touched.title && fieldErrors.title ? (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.title}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-icon">Icon</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="c-icon"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="HeartPulse"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-primary">
                    {(() => {
                      const Icon = resolveIcon(form.icon || null);
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </span>
                </div>
              </div>
              {sectionDef.hasTag ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-tag">Tag (plan label)</Label>
                  <Input
                    id="c-tag"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="Professional"
                  />
                </div>
              ) : null}
              {sectionDef.hasDescription ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-description">Description</Label>
                  <Textarea
                    id="c-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              ) : null}
              {sectionDef.bulletsLabel ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-bullets">{sectionDef.bulletsLabel}</Label>
                  <Textarea
                    id="c-bullets"
                    rows={5}
                    value={form.bulletsText}
                    onChange={(e) => setForm({ ...form, bulletsText: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="c-sort">Sort order</Label>
                <Input
                  id="c-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="c-published" className="text-sm">
                Published (visible on the public site)
              </Label>
              <Switch
                id="c-published"
                checked={form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create card"}
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
              It will no longer appear on the public site. This can't be undone.
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
