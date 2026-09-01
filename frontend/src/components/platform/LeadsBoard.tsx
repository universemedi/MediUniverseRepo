import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { NotebookPen, ShieldAlert, Target } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { col } from "@/config/types";
import type { Row } from "@/lib/rows";
import type { LeadApiDto, PlatformStaffApiDto } from "@/lib/types";
import { DataTable } from "@/components/common/DataTable";
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

function toRow(l: LeadApiDto): Row {
  return {
    id: String(l.id),
    name: l.name,
    organization: l.organizationName ?? "",
    email: l.email,
    phone: l.phone ?? "",
    status: l.status,
    assignedTo: l.assignedToName ?? "Unassigned",
  };
}

export function LeadsBoard({ title, description, sourceFilter, emptyLabel }: LeadsBoardProps) {
  const { isPlatform } = usePermissions();
  const [leads, setLeads] = useState<LeadApiDto[] | null>(null);
  const [staff, setStaff] = useState<PlatformStaffApiDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<LeadApiDto | null>(null);
  const [detailsFor, setDetailsFor] = useState<LeadApiDto | null>(null);
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

  const sourceFiltered = useMemo(
    () => (sourceFilter ? (leads ?? []).filter((l) => l.source === sourceFilter) : (leads ?? [])),
    [leads, sourceFilter],
  );

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

  const columns = useMemo(
    () => [
      col("name", "Name", "name", {
        required: true,
        render: (r) => {
          const lead = sourceFiltered.find((l) => String(l.id) === r["id"]);
          return (
            <button
              type="button"
              onClick={() => lead && setDetailsFor(lead)}
              className="font-medium text-foreground hover:underline"
            >
              {r["name"]}
            </button>
          );
        },
      }),
      col("organization", "Organization", "org", { secondary: true }),
      col("email", "Email", "email"),
      col("phone", "Phone", "phone", { secondary: true }),
      col("status", "Status", "badge", {
        options: [...STATUSES],
        render: (r) => {
          const lead = sourceFiltered.find((l) => String(l.id) === r["id"]);
          if (!lead) return null;
          return (
            <Select value={lead.status} onValueChange={(v) => changeStatus(lead, v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
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
          );
        },
      }),
      col("assignedTo", "Assigned to", "badge", {
        secondary: true,
        options: ["Unassigned", ...staff.map((s) => s.fullName)],
        render: (r) => {
          const lead = sourceFiltered.find((l) => String(l.id) === r["id"]);
          if (!lead) return null;
          return (
            <Select
              value={lead.assignedToUserId ? String(lead.assignedToUserId) : "unassigned"}
              onValueChange={(v) => assign(lead, v)}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
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
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceFiltered, staff],
  );

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !leads ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : sourceFiltered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Target className="mx-auto mb-2 h-6 w-6" />
          {emptyLabel}
        </Card>
      ) : (
        <DataTable
          id={sourceFilter ?? "platform/leads"}
          title={title}
          rows={sourceFiltered.map(toRow)}
          columns={columns}
          canExport
          rowActions={(r) => [
            {
              label: "Add note",
              icon: <NotebookPen className="h-4 w-4" />,
              onClick: () => {
                const lead = sourceFiltered.find((l) => String(l.id) === r["id"]);
                if (lead) {
                  setNoteFor(lead);
                  setNoteText("");
                }
              },
            },
          ]}
        />
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

      <Dialog open={!!detailsFor} onOpenChange={(v) => !v && setDetailsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailsFor?.name}</DialogTitle>
            <DialogDescription>
              {detailsFor?.organizationName ?? "No organization given"}
            </DialogDescription>
          </DialogHeader>
          {detailsFor ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span> {detailsFor.email}
              </p>
              {detailsFor.phone ? (
                <p>
                  <span className="text-muted-foreground">Phone:</span> {detailsFor.phone}
                </p>
              ) : null}
              {detailsFor.city || detailsFor.state ? (
                <p>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  {[detailsFor.city, detailsFor.state].filter(Boolean).join(", ")}
                </p>
              ) : null}
              {detailsFor.modulesOfInterest ? (
                <p>
                  <span className="text-muted-foreground">Interested in:</span>{" "}
                  {detailsFor.modulesOfInterest}
                </p>
              ) : null}
              {detailsFor.preferredDemoDate ? (
                <p>
                  <span className="text-muted-foreground">Preferred date:</span>{" "}
                  {detailsFor.preferredDemoDate}
                </p>
              ) : null}
              {detailsFor.message ? (
                <p className="italic text-muted-foreground">"{detailsFor.message}"</p>
              ) : null}
              {detailsFor.internalNotes ? (
                <p className="whitespace-pre-line rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                  {detailsFor.internalNotes}
                </p>
              ) : null}
              <Badge variant="outline" className={STATUS_STYLE[detailsFor.status] ?? ""}>
                {detailsFor.status.replace("_", " ")}
              </Badge>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
