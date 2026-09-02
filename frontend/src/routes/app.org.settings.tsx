import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/org/settings")({
  head: () => ({
    meta: [
      { title: "Organization Settings — MediUnivers" },
      {
        name: "description",
        content: "Your organization's profile, contact details and defaults.",
      },
    ],
  }),
  component: SettingsPage,
});

interface OrgProfile {
  organizationCode: string;
  slug: string;
  name: string;
  status: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  gstNumber: string | null;
  registrationNumber: string | null;
  website: string | null;
}
interface OrgSettings {
  dateFormat: string;
  timeFormat: string;
  appointmentSlotMinutes: number;
  appointmentBufferMinutes: number;
  allowOverbooking: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  TRIAL: "border-amber-300 bg-amber-50 text-amber-700",
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  GRACE_PERIOD: "border-amber-300 bg-amber-50 text-amber-700",
  SUSPENDED: "border-destructive/25 bg-destructive/10 text-destructive",
  CANCELLED: "border-destructive/25 bg-destructive/10 text-destructive",
};

function SettingsPage() {
  const { isPlatform, roleDef } = usePermissions();
  const canManage = !isPlatform && ["ORG_OWNER", "ORG_ADMIN"].includes(roleDef.key);

  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function load() {
    if (isPlatform) return;
    Promise.all([
      apiFetch<OrgProfile>("/api/org/profile"),
      apiFetch<OrgSettings>("/api/org/settings"),
    ])
      .then(([p, s]) => {
        setProfile(p);
        setSettings(s);
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Couldn't load organization settings.",
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

  async function saveProfile() {
    if (!profile) return;
    if (!profile.name.trim() || profile.name.trim().length < 3) {
      setNameError("Organization name must be at least 3 characters.");
      return;
    }
    setNameError(null);
    setSavingProfile(true);
    try {
      const updated = await apiFetch<OrgProfile>("/api/org/profile", {
        method: "PUT",
        data: profile,
      });
      setProfile(updated);
      toast.success("Organization profile saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save the profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await apiFetch<OrgSettings>("/api/org/settings", {
        method: "PUT",
        data: { ...settings, businessHoursJson: null },
      });
      setSettings(updated);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  if (loadError) return <Card className="p-4 text-sm text-destructive">{loadError}</Card>;
  if (!profile || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile, contact details and operational defaults.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {profile.organizationCode}
          </Badge>
          <Badge variant="outline" className={STATUS_STYLE[profile.status] ?? ""}>
            {profile.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" /> Organization profile
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Organization name <span className="font-bold text-destructive">*</span>
            </Label>
            <Input
              value={profile.name}
              disabled={!canManage}
              onChange={(e) => {
                setProfile({ ...profile, name: e.target.value });
                if (nameError) setNameError(null);
              }}
              className={cn(nameError && "border-destructive")}
            />
            {nameError ? (
              <p className="text-[11px] font-medium text-destructive">{nameError}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={profile.email ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={profile.phone ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={profile.addressLine1 ?? ""}
              disabled={!canManage}
              placeholder="Address line 1"
              onChange={(e) => setProfile({ ...profile, addressLine1: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input
              value={profile.city ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input
              value={profile.state ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, state: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input
              value={profile.country ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Postal code</Label>
            <Input
              value={profile.postalCode ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>GST number</Label>
            <Input
              value={profile.gstNumber ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={profile.website ?? ""}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            />
          </div>
        </div>
        {canManage ? (
          <div className="flex justify-end border-t pt-4">
            <Button onClick={saveProfile} disabled={savingProfile}>
              <Save className="h-4 w-4" /> {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Operational defaults
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Date format</Label>
            <Select
              value={settings.dateFormat}
              onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time format</Label>
            <Select
              value={settings.timeFormat}
              onValueChange={(v) => setSettings({ ...settings, timeFormat: v })}
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12_HOUR">12-hour</SelectItem>
                <SelectItem value="24_HOUR">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Appointment slot (minutes)</Label>
            <Input
              type="number"
              min="5"
              value={settings.appointmentSlotMinutes}
              disabled={!canManage}
              onChange={(e) =>
                setSettings({ ...settings, appointmentSlotMinutes: Number(e.target.value) || 15 })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Buffer between appointments (minutes)</Label>
            <Input
              type="number"
              min="0"
              value={settings.appointmentBufferMinutes}
              disabled={!canManage}
              onChange={(e) =>
                setSettings({ ...settings, appointmentBufferMinutes: Number(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        {canManage ? (
          <div className="flex justify-end border-t pt-4">
            <Button onClick={saveSettings} disabled={savingSettings}>
              <Save className="h-4 w-4" /> {savingSettings ? "Saving…" : "Save settings"}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
