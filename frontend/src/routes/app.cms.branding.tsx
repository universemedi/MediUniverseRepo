import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ExternalLink, Globe, Lock, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiFetchPublic, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { MultiImageUploadField } from "@/components/common/MultiImageUploadField";
import { VideoUploadField } from "@/components/common/VideoUploadField";
import {
  cleanFooterColumnsJson,
  cleanNavLinksJson,
  FooterColumnsEditor,
  NavLinksEditor,
  parseFooterColumns,
  parseNavLinks,
  serializeFooterColumns,
  serializeNavLinks,
} from "@/components/common/SiteNavFooterEditors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/app/cms/branding")({
  head: () => ({
    meta: [
      { title: "Website Builder — MediUnivers" },
      {
        name: "description",
        content: "Branding, pages, contact info and SEO for your organization's public website.",
      },
    ],
  }),
  component: BrandingPage,
});

interface WebsiteConfig {
  templateCode: string;
  templateId: number | null;
  published: boolean;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  backgroundColor: string | null;
  textSizeScale: string;
  tagline: string | null;
  heroHeading: string | null;
  heroSubheading: string | null;
  aboutContent: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  whatsappNumber: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  bannersJson: string | null;
  navItemsJson: string | null;
  footerColumnsJson: string | null;
  bookingEnabled: boolean;
  siteUrl: string;
  heroVideoUrl: string | null;
  slug: string;
}

interface WebsiteTemplateOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
  previewImageUrl: string | null;
}

function parseImageArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return [];
  }
}

function BrandingPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("cms");

  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [templates, setTemplates] = useState<WebsiteTemplateOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    if (isPlatform || unavailable) return;
    Promise.all([
      apiFetch<WebsiteConfig>("/api/org/website/config"),
      apiFetchPublic<WebsiteTemplateOption[]>("/api/public/website-templates", {
        params: { audience: "ORGANIZATION" },
      }),
    ])
      .then(([c, t]) => {
        setConfig(c);
        setTemplates(t);
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Couldn't load your website settings.",
        ),
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

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await apiFetch<WebsiteConfig>("/api/org/website/config", {
        method: "PUT",
        data: {
          ...config,
          navItemsJson: cleanNavLinksJson(config.navItemsJson),
          footerColumnsJson: cleanFooterColumnsJson(config.footerColumnsJson),
        },
      });
      setConfig(updated);
      toast.success("Website settings saved", {
        description: updated.published
          ? "Live at " + updated.siteUrl
          : "Saved as a draft — publish when you're ready.",
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your website settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;
  if (!config) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Website Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Branding, pages, contact details and SEO for your public site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              config.published
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "text-muted-foreground"
            }
          >
            {config.published ? "Published" : "Draft"}
          </Badge>
          {config.published ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/site/${config.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Publish
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> {config.siteUrl}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              That address goes live once this domain is purchased and pointed at MediUnivers — use
              "View site" above to preview your published site right now.
            </p>
          </div>
          <Switch
            checked={config.published}
            onCheckedChange={(v) => setConfig({ ...config, published: v })}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Template
        </p>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates available yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setConfig({ ...config, templateId: t.id })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  config.templateId === t.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <p className="font-semibold text-foreground">{t.name}</p>
                {t.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Branding
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <ImageUploadField
              label="Logo"
              value={config.logoUrl ?? null}
              onChange={(url) => setConfig({ ...config, logoUrl: url })}
              uploadPath="/api/org/uploads"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="h-9 w-12 rounded border"
              />
              <Input
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Secondary color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.secondaryColor}
                onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                className="h-9 w-12 rounded border"
              />
              <Input
                value={config.secondaryColor}
                onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Background color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.backgroundColor ?? "#ffffff"}
                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                className="h-9 w-12 rounded border"
              />
              <Input
                value={config.backgroundColor ?? ""}
                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Font family</Label>
            <Input
              value={config.fontFamily ?? ""}
              onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
              placeholder="Inter, sans-serif"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Text size</Label>
            <Select
              value={config.textSizeScale}
              onValueChange={(v) => setConfig({ ...config, textSizeScale: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMALL">Small</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LARGE">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tagline</Label>
            <Input
              value={config.tagline ?? ""}
              onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
              placeholder="Compassionate care, close to home"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Home page
        </p>
        <div className="space-y-4">
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
          <MultiImageUploadField
            label="Hero carousel photos"
            values={parseImageArray(config.bannersJson)}
            onChange={(urls) =>
              setConfig({ ...config, bannersJson: urls.length ? JSON.stringify(urls) : null })
            }
            max={5}
            uploadPath="/api/org/uploads"
          />
          <VideoUploadField
            label="Intro video"
            value={config.heroVideoUrl ?? null}
            onChange={(url) => setConfig({ ...config, heroVideoUrl: url })}
            uploadPath="/api/org/uploads"
          />
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          About page
        </p>
        <Textarea
          rows={5}
          value={config.aboutContent ?? ""}
          onChange={(e) => setConfig({ ...config, aboutContent: e.target.value })}
        />
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Contact & booking
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Contact email</Label>
            <Input
              type="email"
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
            <Label>Address</Label>
            <Input
              value={config.contactAddress ?? ""}
              onChange={(e) => setConfig({ ...config, contactAddress: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp number</Label>
            <Input
              value={config.whatsappNumber ?? ""}
              onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 pt-6 text-xs text-muted-foreground sm:col-span-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Online appointment booking is always included on your website.
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Social links
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Facebook</Label>
            <Input
              value={config.facebookUrl ?? ""}
              onChange={(e) => setConfig({ ...config, facebookUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram</Label>
            <Input
              value={config.instagramUrl ?? ""}
              onChange={(e) => setConfig({ ...config, instagramUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Twitter / X</Label>
            <Input
              value={config.twitterUrl ?? ""}
              onChange={(e) => setConfig({ ...config, twitterUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>LinkedIn</Label>
            <Input
              value={config.linkedinUrl ?? ""}
              onChange={(e) => setConfig({ ...config, linkedinUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>YouTube</Label>
            <Input
              value={config.youtubeUrl ?? ""}
              onChange={(e) => setConfig({ ...config, youtubeUrl: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Header & footer
        </p>
        <p className="text-xs text-muted-foreground">
          Your site already shows About, Services, Doctors, Testimonials, Blog and Contact — add
          extra links here (e.g. a Careers page) and they'll appear alongside those, in the header
          menu and in the footer.
        </p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Extra navigation links</Label>
            <NavLinksEditor
              value={parseNavLinks(config.navItemsJson)}
              onChange={(next) => setConfig({ ...config, navItemsJson: serializeNavLinks(next) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Footer link columns</Label>
            <FooterColumnsEditor
              value={parseFooterColumns(config.footerColumnsJson)}
              onChange={(next) =>
                setConfig({ ...config, footerColumnsJson: serializeFooterColumns(next) })
              }
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">SEO</p>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>SEO keywords (comma separated)</Label>
            <Input
              value={config.seoKeywords ?? ""}
              onChange={(e) => setConfig({ ...config, seoKeywords: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save website"}
        </Button>
      </div>
    </div>
  );
}
