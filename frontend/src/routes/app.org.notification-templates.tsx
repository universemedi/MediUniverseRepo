import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, MessageSquareText, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/app/org/notification-templates")({
  head: () => ({
    meta: [
      { title: "Notification Templates — MediUnivers" },
      {
        name: "description",
        content:
          "Edit the wording of every email, SMS and in-app notification this organization sends.",
      },
    ],
  }),
  component: NotificationTemplatesPage,
});

interface Template {
  id: number;
  eventType: string;
  category: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  supportedVariables: string | null;
  active: boolean;
  locked: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  USER_INVITED: "Staff invitation",
  APPOINTMENT_BOOKED: "Appointment booked",
  APPOINTMENT_CANCELLED: "Appointment cancelled",
  APPOINTMENT_REMINDER: "Appointment reminder",
  INVOICE_GENERATED: "Invoice generated",
  PAYMENT_RECEIVED: "Payment received",
  LAB_REPORT_READY: "Lab report ready",
  WEBSITE_CONTACT_RECEIVED: "New website enquiry",
};

const CHANNEL_STYLE: Record<string, string> = {
  EMAIL: "border-sky-300 bg-sky-50 text-sky-700",
  SMS: "border-amber-300 bg-amber-50 text-amber-700",
  WHATSAPP: "border-emerald-300 bg-emerald-50 text-emerald-700",
  IN_APP: "border-slate-300 bg-slate-50 text-slate-700",
};

function TemplateRow({
  template,
  canManage,
  onSaved,
}: {
  template: Template;
  canManage: boolean;
  onSaved: (t: Template) => void;
}) {
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.active);
  const [saving, setSaving] = useState(false);
  const dirty =
    subject !== (template.subject ?? "") || body !== template.body || active !== template.active;

  async function save() {
    setSaving(true);
    try {
      const updated = await apiFetch<Template>(`/api/org/communication/templates/${template.id}`, {
        method: "PUT",
        data: { subject: template.subject !== null ? subject : null, body, active },
      });
      onSaved(updated);
      toast.success(`"${template.name}" saved`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save this template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={CHANNEL_STYLE[template.channel] ?? ""}>
            {template.channel.replace("_", "-")}
          </Badge>
          <p className="text-sm font-medium">{template.name}</p>
          {template.locked && (
            <span title="Required for billing/security — can't be switched off">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Active</Label>
          <Switch
            checked={active}
            disabled={!canManage || template.locked}
            onCheckedChange={setActive}
          />
        </div>
      </div>

      {template.subject !== null && (
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input
            value={subject}
            disabled={!canManage}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <Textarea
          rows={4}
          value={body}
          disabled={!canManage}
          onChange={(e) => setBody(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      {template.supportedVariables && (
        <p className="text-xs text-muted-foreground">
          Placeholders:{" "}
          {template.supportedVariables
            .split(",")
            .map((v) => `{{${v}}}`)
            .join("  ")}
        </p>
      )}
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={save}>
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationTemplatesPage() {
  const { isPlatform, roleDef } = usePermissions();
  const canManage = !isPlatform && ["ORG_OWNER", "ORG_ADMIN"].includes(roleDef.key);

  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    if (isPlatform) return;
    apiFetch<Template[]>("/api/org/communication/templates")
      .then(setTemplates)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load templates."),
      );
  }
  useEffect(load, [isPlatform]);

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

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;
  if (!templates) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  const byEvent = new Map<string, Template[]>();
  for (const t of templates) {
    if (!byEvent.has(t.eventType)) byEvent.set(t.eventType, []);
    byEvent.get(t.eventType)!.push(t);
  }

  function updateOne(updated: Template) {
    setTemplates((prev) => (prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessageSquareText className="h-5 w-5" /> Notification Templates
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The wording of every email, SMS, WhatsApp and in-app message this organization sends —
          nothing is hardcoded, edit anything below and it takes effect immediately.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Staff invitations and password-reset emails aren't listed here — those always go out
          through MediUnivers' own reliable delivery, so a new organization's very first invite
          still arrives before anyone has set up this page's Email settings.
        </p>
      </div>

      <Card className="p-2">
        <Accordion type="multiple" className="w-full">
          {Array.from(byEvent.entries()).map(([eventType, items]) => (
            <AccordionItem key={eventType} value={eventType} className="px-3">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  {EVENT_LABELS[eventType] ?? eventType}
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {items.length} channel{items.length > 1 ? "s" : ""}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                {items.map((t) => (
                  <TemplateRow key={t.id} template={t} canManage={canManage} onSaved={updateOne} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
