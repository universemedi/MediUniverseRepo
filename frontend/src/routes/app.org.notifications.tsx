import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Bell, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/org/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Logs — MediUnivers" },
      {
        name: "description",
        content: "Every email, SMS, WhatsApp and in-app send attempt for this organization.",
      },
    ],
  }),
  component: NotificationLogsPage,
});

interface Notification {
  id: number;
  eventType: string;
  category: string;
  channel: string;
  priority: string;
  status: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  scheduledFor: string | null;
  createdAt: string;
  sentAt: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "border-slate-300 bg-slate-50 text-slate-700",
  QUEUED: "border-slate-300 bg-slate-50 text-slate-700",
  PROCESSING: "border-amber-300 bg-amber-50 text-amber-700",
  SENT: "border-emerald-300 bg-emerald-50 text-emerald-700",
  DELIVERED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  FAILED: "border-destructive/25 bg-destructive/10 text-destructive",
  EXPIRED: "border-destructive/25 bg-destructive/10 text-destructive",
};

function recipient(n: Notification): string {
  return n.recipientEmail || n.recipientPhone || n.recipientName || "—";
}

function NotificationLogsPage() {
  const { isPlatform } = usePermissions();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("ALL");
  const [channel, setChannel] = useState<string>("ALL");

  function load() {
    if (isPlatform) return;
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (channel !== "ALL") params.set("channel", channel);
    apiFetch<Notification[]>(`/api/org/notifications?${params.toString()}`)
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load notifications."),
      );
  }

  useEffect(load, [isPlatform, status, channel]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="h-5 w-5" /> Notification Logs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every send attempt across Email, SMS, WhatsApp and In-App, most recent first.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All channels</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="IN_APP">In-app</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadError && <Card className="p-4 text-sm text-destructive">{loadError}</Card>}
      {!items && !loadError && (
        <div className="space-y-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      )}
      {items && (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Sent / Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No notifications yet.
                  </TableCell>
                </TableRow>
              )}
              {items.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{n.eventType.replaceAll("_", " ")}</div>
                    {n.subject && <div className="text-xs text-muted-foreground">{n.subject}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{n.channel.replace("_", "-")}</TableCell>
                  <TableCell className="text-sm">{recipient(n)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[n.status] ?? ""}>
                      {n.status}
                    </Badge>
                    {n.status === "FAILED" && n.errorMessage && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {n.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {n.retryCount}/{n.maxRetries}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(n.sentAt ?? n.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
