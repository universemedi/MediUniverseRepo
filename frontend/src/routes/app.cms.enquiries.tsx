import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, Lock, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/cms/enquiries")({
  head: () => ({
    meta: [
      { title: "Website Enquiries — MediUnivers" },
      { name: "description", content: "Messages left through your public website's contact form." },
    ],
  }),
  component: EnquiriesPage,
});

interface Submission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
}

function EnquiriesPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const unavailable = !isPlatform && isUnavailable("cms");

  const [items, setItems] = useState<Submission[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    if (isPlatform || unavailable) return;
    apiFetch<Submission[]>("/api/org/website/contact-submissions")
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load enquiries."),
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

  async function markRead(item: Submission) {
    try {
      await apiFetch(`/api/org/website/contact-submissions/${item.id}/mark-read`, {
        method: "POST",
      });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this enquiry.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages left through your public website's contact form.
        </p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !items ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <Inbox className="mx-auto mb-2 h-6 w-6" /> No enquiries yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {items.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-3 p-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.name} <span className="font-normal text-muted-foreground">· {s.email}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.message}</p>
              </div>
              <Badge
                variant="outline"
                className={
                  s.status === "NEW"
                    ? "border-amber-300 bg-amber-50 text-amber-700 cursor-pointer"
                    : "text-muted-foreground"
                }
                onClick={() => s.status === "NEW" && markRead(s)}
              >
                {s.status}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
