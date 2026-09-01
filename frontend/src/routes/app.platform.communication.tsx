import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MailCheck, MessageSquare, Save, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type {
  PlatformCommunicationSettingsDto,
  PlatformNotificationDto,
  PlatformNotificationTemplateDto,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/platform/communication")({
  head: () => ({
    meta: [
      { title: "Platform Communication — MediUnivers" },
      {
        name: "description",
        content:
          "MediUnivers' own outgoing email/SMS settings, and the wording of every account-security message it sends.",
      },
    ],
  }),
  component: PlatformCommunicationPage,
});

interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  useTls: boolean;
}
interface SmsConfig {
  apiUrl: string;
  apiKey: string;
  senderId: string;
}

const EMPTY_EMAIL: EmailConfig = {
  host: "",
  port: 587,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "MediUnivers",
  useTls: true,
};
const EMPTY_SMS: SmsConfig = { apiUrl: "", apiKey: "", senderId: "" };

const EVENT_LABELS: Record<string, string> = {
  ORG_USER_INVITED: "Organization user invited",
  PLATFORM_STAFF_INVITED: "Platform staff invited",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  SUBSCRIPTION_EXPIRING_SOON: "Subscription expiring soon",
  SUBSCRIPTION_EXPIRED: "Subscription expired",
  SUBSCRIPTION_RENEWED: "Subscription renewed",
  ORGANIZATION_STATUS_CHANGED: "Organization status changed",
  ORG_WELCOME: "Organization welcome",
  LEAD_STATUS_UPDATED: "Lead status updated",
  COUPON_SHARED: "Coupon shared",
};

const STATUS_STYLE: Record<string, string> = {
  SENT: "border-emerald-300 bg-emerald-50 text-emerald-700",
  DELIVERED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  FAILED: "border-destructive/25 bg-destructive/10 text-destructive",
  PENDING: "border-sky-300 bg-sky-50 text-sky-700",
  QUEUED: "border-sky-300 bg-sky-50 text-sky-700",
  PROCESSING: "border-amber-300 bg-amber-50 text-amber-700",
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function TemplateRow({
  template,
  onSaved,
}: {
  template: PlatformNotificationTemplateDto;
  onSaved: (t: PlatformNotificationTemplateDto) => void;
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
      const updated = await apiFetch<PlatformNotificationTemplateDto>(
        `/api/platform/communication/templates/${template.id}`,
        {
          method: "PUT",
          data: { subject: template.subject !== null ? subject : null, body, active },
        },
      );
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
          <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
            {template.channel}
          </Badge>
          <p className="text-sm font-medium">{EVENT_LABELS[template.eventType] ?? template.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Active</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      </div>
      {template.subject !== null && (
        <div className="space-y-1.5">
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <Textarea
          rows={4}
          value={body}
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
      <div className="flex justify-end">
        <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={save}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function PlatformCommunicationPage() {
  const { isPlatform, role } = usePermissions();
  const canManage = isPlatform && role === "SUPER_ADMIN";

  const [settings, setSettings] = useState<PlatformCommunicationSettingsDto | null>(null);
  const [email, setEmail] = useState<EmailConfig>(EMPTY_EMAIL);
  const [sms, setSms] = useState<SmsConfig>(EMPTY_SMS);
  const [templates, setTemplates] = useState<PlatformNotificationTemplateDto[] | null>(null);
  const [log, setLog] = useState<PlatformNotificationDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testDestination, setTestDestination] = useState({ EMAIL: "", SMS: "" });
  const [testing, setTesting] = useState<string | null>(null);

  function load() {
    if (!canManage) return;
    apiFetch<PlatformCommunicationSettingsDto>("/api/platform/communication/settings")
      .then((s) => {
        setSettings(s);
        setEmail(parseJson(s.emailConfigJson, EMPTY_EMAIL));
        setSms(parseJson(s.smsConfigJson, EMPTY_SMS));
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Couldn't load communication settings.",
        ),
      );
    apiFetch<PlatformNotificationTemplateDto[]>("/api/platform/communication/templates")
      .then(setTemplates)
      .catch(() => setTemplates([]));
    apiFetch<PlatformNotificationDto[]>("/api/platform/communication/log?limit=25")
      .then(setLog)
      .catch(() => setLog([]));
  }
  useEffect(load, [canManage]);

  if (!canManage) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Super Admin only</h1>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await apiFetch<PlatformCommunicationSettingsDto>(
        "/api/platform/communication/settings",
        {
          method: "PUT",
          data: {
            ...settings,
            emailConfigJson: JSON.stringify(email),
            smsConfigJson: JSON.stringify(sms),
          },
        },
      );
      setSettings(updated);
      toast.success("Platform communication settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save communication settings.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest(channel: "EMAIL" | "SMS") {
    const destination = testDestination[channel];
    if (!destination) {
      toast.error(
        channel === "EMAIL" ? "Enter an email address to test." : "Enter a phone number to test.",
      );
      return;
    }
    setTesting(channel);
    try {
      const res = await apiFetch<{ message: string }>("/api/platform/communication/test-send", {
        method: "POST",
        data: { channel, destination },
      });
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Test message failed.");
    } finally {
      setTesting(null);
    }
  }

  function updateOneTemplate(updated: PlatformNotificationTemplateDto) {
    setTemplates((prev) => (prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev));
  }

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;
  if (!settings || !templates) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MailCheck className="h-5 w-5" /> Platform Communication
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MediUnivers' own outgoing email/SMS — used only for account-security messages (invites,
          password resets) that must go out from the platform itself, not from a tenant's own
          (possibly not-yet-configured) provider. This is separate from each organization's own
          Communication Settings, which they use for their own customer messages.
        </p>
      </div>

      {/* Email */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> Email
          </p>
          <Switch
            checked={settings.emailEnabled}
            onCheckedChange={(v) => setSettings({ ...settings, emailEnabled: v })}
          />
        </div>
        {settings.emailEnabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>SMTP host</Label>
                <Input
                  value={email.host}
                  placeholder="smtp.mediunivers.io"
                  onChange={(e) => setEmail({ ...email, host: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={email.port}
                  onChange={(e) => setEmail({ ...email, port: Number(e.target.value) || 587 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={email.username}
                  onChange={(e) => setEmail({ ...email, username: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={email.password}
                  onChange={(e) => setEmail({ ...email, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>From email</Label>
                <Input
                  type="email"
                  value={email.fromEmail}
                  placeholder="no-reply@mediunivers.io"
                  onChange={(e) => setEmail({ ...email, fromEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>From name</Label>
                <Input
                  value={email.fromName}
                  onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Input
                type="email"
                placeholder="Send a test email to…"
                className="max-w-xs"
                value={testDestination.EMAIL}
                onChange={(e) => setTestDestination({ ...testDestination, EMAIL: e.target.value })}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={testing === "EMAIL"}
                onClick={() => sendTest("EMAIL")}
              >
                <Send className="h-3.5 w-3.5" /> {testing === "EMAIL" ? "Sending…" : "Send test"}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* SMS */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> SMS
          </p>
          <Switch
            checked={settings.smsEnabled}
            onCheckedChange={(v) => setSettings({ ...settings, smsEnabled: v })}
          />
        </div>
        {settings.smsEnabled && (
          <>
            <p className="text-xs text-muted-foreground">
              Leave the API URL blank to run in Local Gateway mode — messages are logged instead of
              sent, enough to test the rest of the flow before a real provider is plugged in.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Gateway API URL</Label>
                <Input
                  value={sms.apiUrl}
                  placeholder="https://api.yourgateway.com/send"
                  onChange={(e) => setSms({ ...sms, apiUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>API key</Label>
                <Input
                  type="password"
                  value={sms.apiKey}
                  onChange={(e) => setSms({ ...sms, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sender ID</Label>
                <Input
                  value={sms.senderId}
                  onChange={(e) => setSms({ ...sms, senderId: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <Input
                placeholder="Send a test SMS to…"
                className="max-w-xs"
                value={testDestination.SMS}
                onChange={(e) => setTestDestination({ ...testDestination, SMS: e.target.value })}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={testing === "SMS"}
                onClick={() => sendTest("SMS")}
              >
                <Send className="h-3.5 w-3.5" /> {testing === "SMS" ? "Sending…" : "Send test"}
              </Button>
            </div>
          </>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save communication settings"}
        </Button>
      </div>

      {/* Templates */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-semibold tracking-tight">Message wording</h2>
        <p className="text-sm text-muted-foreground">
          Edit anything below and it takes effect immediately for every future invite/reset email.
        </p>
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} onSaved={updateOneTemplate} />
          ))}
        </div>
      </div>

      {/* Recent log */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
        {!log ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : log.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nothing sent yet.</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">
                      {EVENT_LABELS[n.eventType] ?? n.eventType}
                    </TableCell>
                    <TableCell>{n.channel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {n.recipientEmail ?? n.recipientPhone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_STYLE[n.status] ?? ""}
                        title={n.errorMessage ?? undefined}
                      >
                        {n.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
