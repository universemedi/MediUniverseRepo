import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone, Save, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/org/communication")({
  head: () => ({
    meta: [
      { title: "Communication Settings — MediUnivers" },
      {
        name: "description",
        content: "Configure Email, SMS and WhatsApp delivery for this organization.",
      },
    ],
  }),
  component: CommunicationSettingsPage,
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
  apiSecret: string;
  senderId: string;
}
interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
}

interface Settings {
  emailEnabled: boolean;
  emailProvider: string;
  emailConfigJson: string | null;
  smsEnabled: boolean;
  smsProvider: string;
  smsConfigJson: string | null;
  whatsappEnabled: boolean;
  whatsappProvider: string;
  whatsappConfigJson: string | null;
  inAppEnabled: boolean;
}

const EMPTY_EMAIL: EmailConfig = {
  host: "",
  port: 587,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  useTls: true,
};
const EMPTY_SMS: SmsConfig = { apiUrl: "", apiKey: "", apiSecret: "", senderId: "" };
const EMPTY_WHATSAPP: WhatsAppConfig = { apiUrl: "", apiKey: "", phoneNumberId: "" };

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function CommunicationSettingsPage() {
  const { isPlatform, roleDef } = usePermissions();
  const canManage = !isPlatform && ["ORG_OWNER", "ORG_ADMIN"].includes(roleDef.key);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState<EmailConfig>(EMPTY_EMAIL);
  const [sms, setSms] = useState<SmsConfig>(EMPTY_SMS);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>(EMPTY_WHATSAPP);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testDestination, setTestDestination] = useState({ EMAIL: "", SMS: "", WHATSAPP: "" });
  const [testing, setTesting] = useState<string | null>(null);

  function load() {
    if (isPlatform) return;
    apiFetch<Settings>("/api/org/communication/settings")
      .then((s) => {
        setSettings(s);
        setEmail(parseJson(s.emailConfigJson, EMPTY_EMAIL));
        setSms(parseJson(s.smsConfigJson, EMPTY_SMS));
        setWhatsapp(parseJson(s.whatsappConfigJson, EMPTY_WHATSAPP));
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Couldn't load communication settings.",
        ),
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

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Settings>("/api/org/communication/settings", {
        method: "PUT",
        data: {
          ...settings,
          emailConfigJson: JSON.stringify(email),
          smsConfigJson: JSON.stringify(sms),
          whatsappConfigJson: JSON.stringify(whatsapp),
        },
      });
      setSettings(updated);
      toast.success("Communication settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save communication settings.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest(channel: "EMAIL" | "SMS" | "WHATSAPP") {
    const destination = testDestination[channel];
    if (!destination) {
      toast.error(
        channel === "EMAIL" ? "Enter an email address to test." : "Enter a phone number to test.",
      );
      return;
    }
    setTesting(channel);
    try {
      const res = await apiFetch<{ message: string }>("/api/org/communication/test-send", {
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

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;
  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which channels this organization sends notifications through, and configure your
          own provider credentials for each. Every appointment, invoice, payment and lab report
          notification goes out through whatever is switched on here.
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
            disabled={!canManage}
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
                  disabled={!canManage}
                  placeholder="smtp.yourdomain.com"
                  onChange={(e) => setEmail({ ...email, host: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={email.port}
                  disabled={!canManage}
                  onChange={(e) => setEmail({ ...email, port: Number(e.target.value) || 587 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={email.username}
                  disabled={!canManage}
                  onChange={(e) => setEmail({ ...email, username: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={email.password}
                  disabled={!canManage}
                  onChange={(e) => setEmail({ ...email, password: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>From email</Label>
                <Input
                  type="email"
                  value={email.fromEmail}
                  disabled={!canManage}
                  onChange={(e) => setEmail({ ...email, fromEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>From name</Label>
                <Input
                  value={email.fromName}
                  disabled={!canManage}
                  onChange={(e) => setEmail({ ...email, fromName: e.target.value })}
                />
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Input
                  type="email"
                  placeholder="Send a test email to…"
                  className="max-w-xs"
                  value={testDestination.EMAIL}
                  onChange={(e) =>
                    setTestDestination({ ...testDestination, EMAIL: e.target.value })
                  }
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
            )}
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
            disabled={!canManage}
            onCheckedChange={(v) => setSettings({ ...settings, smsEnabled: v })}
          />
        </div>
        {settings.smsEnabled && (
          <>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select
                value={settings.smsProvider}
                disabled={!canManage}
                onValueChange={(v) => setSettings({ ...settings, smsProvider: v })}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL_GATEWAY">
                    Local Gateway (simulated — no credentials needed)
                  </SelectItem>
                  <SelectItem value="TWILIO">Twilio</SelectItem>
                  <SelectItem value="MSG91">MSG91</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.smsProvider === "TWILIO" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  From your Twilio console — the message is sent through Twilio's own API directly,
                  no gateway URL needed.
                </p>
                <div className="space-y-1.5">
                  <Label>Account SID</Label>
                  <Input
                    value={sms.apiKey}
                    disabled={!canManage}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    onChange={(e) => setSms({ ...sms, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Auth token</Label>
                  <Input
                    type="password"
                    value={sms.apiSecret}
                    disabled={!canManage}
                    onChange={(e) => setSms({ ...sms, apiSecret: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>From number</Label>
                  <Input
                    value={sms.senderId}
                    disabled={!canManage}
                    placeholder="+15551234567"
                    onChange={(e) => setSms({ ...sms, senderId: e.target.value })}
                  />
                </div>
              </div>
            ) : settings.smsProvider !== "LOCAL_GATEWAY" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gateway API URL</Label>
                  <Input
                    value={sms.apiUrl}
                    disabled={!canManage}
                    placeholder="https://api.yourgateway.com/send"
                    onChange={(e) => setSms({ ...sms, apiUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>API key</Label>
                  <Input
                    type="password"
                    value={sms.apiKey}
                    disabled={!canManage}
                    onChange={(e) => setSms({ ...sms, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sender ID</Label>
                  <Input
                    value={sms.senderId}
                    disabled={!canManage}
                    onChange={(e) => setSms({ ...sms, senderId: e.target.value })}
                  />
                </div>
              </div>
            ) : null}
            {canManage && (
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
            )}
          </>
        )}
      </Card>

      {/* WhatsApp */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Phone className="h-3.5 w-3.5" /> WhatsApp
          </p>
          <Switch
            checked={settings.whatsappEnabled}
            disabled={!canManage}
            onCheckedChange={(v) => setSettings({ ...settings, whatsappEnabled: v })}
          />
        </div>
        {settings.whatsappEnabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>WhatsApp Cloud API URL</Label>
                <Input
                  value={whatsapp.apiUrl}
                  disabled={!canManage}
                  placeholder="https://graph.facebook.com/v19.0/<phone-number-id>/messages"
                  onChange={(e) => setWhatsapp({ ...whatsapp, apiUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>API token</Label>
                <Input
                  type="password"
                  value={whatsapp.apiKey}
                  disabled={!canManage}
                  onChange={(e) => setWhatsapp({ ...whatsapp, apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone number ID</Label>
                <Input
                  value={whatsapp.phoneNumberId}
                  disabled={!canManage}
                  onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
                />
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Input
                  placeholder="Send a test WhatsApp message to…"
                  className="max-w-xs"
                  value={testDestination.WHATSAPP}
                  onChange={(e) =>
                    setTestDestination({ ...testDestination, WHATSAPP: e.target.value })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={testing === "WHATSAPP"}
                  onClick={() => sendTest("WHATSAPP")}
                >
                  <Send className="h-3.5 w-3.5" />{" "}
                  {testing === "WHATSAPP" ? "Sending…" : "Send test"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* In-app */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-semibold">In-app notifications</p>
          <p className="text-sm text-muted-foreground">
            Shown to staff after they log in — always available.
          </p>
        </div>
        <Switch
          checked={settings.inAppEnabled}
          disabled={!canManage}
          onCheckedChange={(v) => setSettings({ ...settings, inAppEnabled: v })}
        />
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save communication settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
