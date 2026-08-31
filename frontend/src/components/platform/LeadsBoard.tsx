import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, Target } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { LeadApiDto, PlatformStaffApiDto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const STATUSES = [
  "NEW_LEAD",
  "CONTACTED",
  "DEMO_SCHEDULED",
  "DEMO_COMPLETED",
  "WON",
  "LOST",
] as const;

const STATUS_STYLE: Record<string, string> = {
  NEW_LEAD: "border-sky-300 bg-sky-50 text-sky-700",
  CONTACTED: "border-amber-300 bg-amber-50 text-amber-700",
  DEMO_SCHEDULED: "border-violet-300 bg-violet-50 text-violet-700",
  DEMO_COMPLETED: "border-indigo-300 bg-indigo-50 text-indigo-700",
  WON: "border-emerald-300 bg-emerald-50 text-emerald-700",
  LOST: "border-destructive/25 bg-destructive/10 text-destructive",
};

interface LeadsBoardProps {
  title: string;
  description: string;
  /** filter to leads with this source, or show every lead if omitted */
  sourceFilter?: string;
  emptyLabel: string;
}

export function LeadsBoard({ title, description, sourceFilter, emptyLabel }: LeadsBoardProps) {
  const { isPlatform } = usePermissions();
  const [leads, setLeads] = useState<LeadApiDto[] | null>(null);
  const [staff, setStaff] = useState<PlatformStaffApiDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<LeadApiDto | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  function load() {
    Promise.all([
      apiFetch<LeadApiDto[]>("/api/platform/leads"),
      apiFetch<PlatformStaffApiDto[]>("/api/platform/staff"),
    ])
      .then(([l, s]) => {
        setLeads(l);
        setStaff(s);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load leads."));
  }
  useEffect(load, []);

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

  const visible = sourceFilter ? (leads ?? []).filter((l) => l.source === sourceFilter) : leads;

  async function changeStatus(lead: LeadApiDto, status: string) {
    try {
      await apiFetch(`/api/platform/leads/${lead.id}/status`, {
        method: "PATCH",
        data: { status },
      });
      toast.success(`${lead.name} → ${status.replace("_", " ").toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this lead.");
    }
  }

  async function assign(lead: LeadApiDto, userId: string) {
    try {
      await apiFetch(`/api/platform/leads/${lead.id}/assign`, {
        method: "PATCH",
        data: { userId: userId === "unassigned" ? null : Number(userId) },
      });
      toast.success(`${lead.name} reassigned`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reassign this lead.");
    }
  }

  async function saveNote() {
    if (!noteFor || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await apiFetch(`/api/platform/leads/${noteFor.id}/notes`, {
        method: "POST",
        data: { note: noteText.trim() },
      });
      toast.success("Note added");
      setNoteFor(null);
      setNoteText("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save this note.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !visible ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Target className="mx-auto mb-2 h-6 w-6" />
          {emptyLabel}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((l) => (
            <Card key={l.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-tight">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.organizationName ?? "—"}</p>
                </div>
                <Badge variant="outline" className={STATUS_STYLE[l.status] ?? ""}>
                  {l.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>{l.email}</p>
                {l.phone ? <p>{l.phone}</p> : null}
                {l.city ? <p>{l.city}</p> : null}
              </div>
              {l.modulesOfInterest ? (
                <p className="text-xs text-muted-foreground">
                  Interested in: {l.modulesOfInterest}
                </p>
              ) : null}
              {l.preferredDemoDate ? (
                <p className="text-xs text-muted-foreground">
                  Preferred date: {l.preferredDemoDate}
                </p>
              ) : null}
              {l.message ? (
                <p className="text-xs text-muted-foreground italic">"{l.message}"</p>
              ) : null}
              {l.internalNotes ? (
                <p className="whitespace-pre-line rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  {l.internalNotes}
                </p>
              ) : null}

              <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                <Select value={l.status} onValueChange={(v) => changeStatus(l, v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={l.assignedToUserId ? String(l.assignedToUserId) : "unassigned"}
                  onValueChange={(v) => assign(l, v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNoteFor(l);
                  setNoteText("");
                }}
              >
                Add note
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!noteFor} onOpenChange={(v) => !v && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note for {noteFor?.name}</DialogTitle>
            <DialogDescription>Visible only to platform staff.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={savingNote || !noteText.trim()}>
              {savingNote ? "Saving…" : "Save note"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
