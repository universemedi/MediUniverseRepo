import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutTemplate, Plus, Save, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { PlatformSiteConfigDto, PlatformSiteStat } from "@/lib/types";
import {
  PAGE_BANNER_LABELS,
  parsePageBanners,
  stringifyPageBanners,
  type PageBannerKey,
  type PageBanners,
} from "@/lib/pageBanners";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/app/platform/cms")({
  head: () => ({
    meta: [
      { title: "Website Content — MediUnivers Platform" },
      {
        name: "description",
        content: "MediUnivers' own site content, SEO settings, and the website template catalog.",
      },
    ],
  }),
  component: PlatformCmsPage,
});

function parseStats(json: string | null): PlatformSiteStat[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s): s is PlatformSiteStat =>
          !!s &&
          typeof s === "object" &&
          typeof s.label === "string" &&
          typeof s.value === "string",
      );
    }
  } catch {
    // malformed JSON — treat as no stats configured yet
  }
  return [];
}

interface WebsiteTemplateRow {
  id: number;
  code: string;
  name: string;
  audience: "PLATFORM" | "ORGANIZATION";
  description: string | null;
  previewImageUrl: string | null;
  active: boolean;
  sortOrder: number;
}

interface TemplateForm {
  code: string;
  name: string;
  audience: "PLATFORM" | "ORGANIZATION";
  description: string;
  previewImageUrl: string;
  active: boolean;
  sortOrder: string;
}

const EMPTY_TEMPLATE_FORM: TemplateForm = {
  code: "",
  name: "",
  audience: "ORGANIZATION",
  description: "",
  previewImageUrl: "",
  active: true,
  sortOrder: "0",
};

function PlatformCmsPage() {
  const { isPlatform, role } = usePermissions();
  const canManageTemplates = role === "SUPER_ADMIN";

  const [config, setConfig] = useState<PlatformSiteConfigDto | null>(null);
  const [stats, setStats] = useState<PlatformSiteStat[]>([]);
  const [pageBanners, setPageBanners] = useState<PageBanners>({});
  const [templates, setTemplates] = useState<WebsiteTemplateRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteTemplateRow | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_TEMPLATE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!isPlatform) return;
    Promise.all([
      apiFetch<PlatformSiteConfigDto>("/api/platform/website-config"),
      apiFetch<WebsiteTemplateRow[]>("/api/platform/website-templates"),
    ])
      .then(([c, t]) => {
        setConfig(c);
        setStats(parseStats(c.statsJson));
        setPageBanners(parsePageBanners(c.pageBannersJson));
        setTemplates(t);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load website content."),
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

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const cleanStats = stats.filter((s) => s.label.trim() && s.value.trim());
      const payload = {
        ...config,
        statsJson: cleanStats.length ? JSON.stringify(cleanStats) : null,
        pageBannersJson: Object.keys(pageBanners).length ? stringifyPageBanners(pageBanners) : null,
      };
      const updated = await apiFetch<PlatformSiteConfigDto>("/api/platform/website-config", {
        method: "PUT",
        data: payload,
      });
      setConfig(updated);
      setStats(parseStats(updated.statsJson));
      setPageBanners(parsePageBanners(updated.pageBannersJson));
      toast.success("MediUnivers site settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save site settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateStat(index: number, field: "label" | "value", value: string) {
    setStats((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStat() {
    setStats((prev) => [...prev, { label: "", value: "" }]);
  }

  function removeStat(index: number) {
    setStats((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePageBanner(key: PageBannerKey, url: string | null) {
    setPageBanners((prev) => {
      const next = { ...prev };
      if (url) next[key] = url;
      else delete next[key];
      return next;
    });
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_TEMPLATE_FORM);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(t: WebsiteTemplateRow) {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      audience: t.audience,
      description: t.description ?? "",
      previewImageUrl: t.previewImageUrl ?? "",
      active: t.active,
      sortOrder: String(t.sortOrder),
    });
    setFormError(null);
    setOpen(true);
  }

  async function submitTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Code and name are required.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      audience: form.audience,
      description: form.description.trim() || null,
      previewImageUrl: form.previewImageUrl.trim() || null,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) {
        await apiFetch(`/api/platform/website-templates/${editing.id}`, {
          method: "PUT",
          data: payload,
        });
        toast.success(`${form.name.trim()} updated`);
      } else {
        await apiFetch("/api/platform/website-templates", { method: "POST", data: payload });
        toast.success(`${form.name.trim()} created`);
      }
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this template.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivateTemplate(t: WebsiteTemplateRow) {
    try {
      await apiFetch(`/api/platform/website-templates/${t.id}`, { method: "DELETE" });
      toast.success(`${t.name} deactivated`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate this template.");
    }
  }

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MediUnivers' own marketing site settings, plus the template catalog available to both
          audiences.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          MediUnivers site
        </h2>
        {!config ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <>
            <Card className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <ImageUploadField
                  label="Logo"
                  value={config.logoUrl ?? null}
                  onChange={(url) => setConfig({ ...config, logoUrl: url ?? "" })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Primary color</Label>
                <Input
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Secondary color</Label>
                <Input
                  value={config.secondaryColor}
                  onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tagline</Label>
                <Input
                  value={config.tagline ?? ""}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hero heading</Label>
                <Input
                  value={config.heroHeading ?? ""}
                  onChange={(e) => setConfig({ ...config, heroHeading: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hero subheading</Label>
                <Input
                  value={config.heroSubheading ?? ""}
                  onChange={(e) => setConfig({ ...config, heroSubheading: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>About</Label>
                <Textarea
                  rows={4}
                  value={config.aboutContent ?? ""}
                  onChange={(e) => setConfig({ ...config, aboutContent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Mission (About page)</Label>
                <Textarea
                  rows={4}
                  value={config.missionContent ?? ""}
                  onChange={(e) => setConfig({ ...config, missionContent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact email</Label>
                <Input
                  value={config.contactEmail ?? ""}
                  onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contact phone</Label>
                <Input
                  value={config.contactPhone ?? ""}
                  onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Contact address</Label>
                <Input
                  value={config.contactAddress ?? ""}
                  onChange={(e) => setConfig({ ...config, contactAddress: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Facebook URL</Label>
                <Input
                  value={config.facebookUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram URL</Label>
                <Input
                  value={config.instagramUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input
                  value={config.linkedinUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>YouTube URL</Label>
                <Input
                  value={config.youtubeUrl ?? ""}
                  onChange={(e) => setConfig({ ...config, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>SEO title</Label>
                <Input
                  value={config.seoTitle ?? ""}
                  onChange={(e) => setConfig({ ...config, seoTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>SEO description</Label>
                <Textarea
                  rows={2}
                  value={config.seoDescription ?? ""}
                  onChange={(e) => setConfig({ ...config, seoDescription: e.target.value })}
                />
              </div>
            </Card>

            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <Label>Homepage stats</Label>
                <Button type="button" size="sm" variant="outline" onClick={addStat}>
                  <Plus className="h-3.5 w-3.5" /> Add stat
                </Button>
              </div>
              {stats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No stat tiles yet — e.g. "480+ Organizations".
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Value (e.g. 480+)"
                        value={s.value}
                        onChange={(e) => updateStat(i, "value", e.target.value)}
                      />
                      <Input
                        placeholder="Label (e.g. Organizations)"
                        value={s.label}
                        onChange={(e) => updateStat(i, "label", e.target.value)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => removeStat(i)}
                        aria-label="Remove stat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <Label className="text-sm font-semibold">Page banners</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  A hero image for each marketing page. Leave a page blank to keep its flat
                  brand-colour background.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {(Object.entries(PAGE_BANNER_LABELS) as [PageBannerKey, string][]).map(
                  ([key, label]) => (
                    <ImageUploadField
                      key={key}
                      label={label}
                      value={pageBanners[key] ?? null}
                      onChange={(url) => updatePageBanner(key, url)}
                    />
                  ),
                )}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <Label className="text-sm font-semibold">Legal pages</Label>
              <div className="space-y-1.5">
                <Label>Privacy Policy</Label>
                <Textarea
                  rows={5}
                  value={config.privacyContent ?? ""}
                  onChange={(e) => setConfig({ ...config, privacyContent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Terms of Service</Label>
                <Textarea
                  rows={5}
                  value={config.termsContent ?? ""}
                  onChange={(e) => setConfig({ ...config, termsContent: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Security</Label>
                <Textarea
                  rows={5}
                  value={config.securityContent ?? ""}
                  onChange={(e) => setConfig({ ...config, securityContent: e.target.value })}
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveConfig} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save site settings"}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Website templates
          </h2>
          {canManageTemplates ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New template
            </Button>
          ) : null}
        </div>

        {!templates ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card
                key={t.id}
                className={`flex flex-col gap-2 p-4 ${!t.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LayoutTemplate className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {t.audience === "PLATFORM" ? "Platform" : "Organization"}
                  </Badge>
                </div>
                {t.description ? (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                ) : null}
                {canManageTemplates ? (
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(t)}
                    >
                      Edit
                    </Button>
                    {t.active ? (
                      <Button size="sm" variant="outline" onClick={() => deactivateTemplate(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New website template"}</DialogTitle>
            <DialogDescription>
              Templates are the catalog org owners (or you, for MediUnivers' own site) pick from.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitTemplate} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Code{!editing ? <span className="ml-1 font-bold text-destructive">*</span> : null}
                </Label>
                <Input
                  value={form.code}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="MODERN"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={form.audience}
                  onValueChange={(v) =>
                    setForm({ ...form, audience: v as "PLATFORM" | "ORGANIZATION" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    <SelectItem value="PLATFORM">Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Preview image URL</Label>
                <Input
                  value={form.previewImageUrl}
                  onChange={(e) => setForm({ ...form, previewImageUrl: e.target.value })}
                />
              </div>
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create template"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
