import { useEffect, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { moduleByPath } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";

export interface PatientSummary {
  id: number;
  patientNumber: string;
  fullName: string;
  phone: string | null;
}

export interface DoctorSummary {
  id: number;
  fullName: string;
}

export interface AppointmentApiDto {
  id: number;
  appointmentNumber: string;
  tokenNumber: string | null;
  type: "SCHEDULED" | "WALK_IN";
  status: "BOOKED" | "CHECKED_IN" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  appointmentDate: string;
  scheduledAt: string | null;
  reason: string | null;
  patient: PatientSummary;
  doctor: DoctorSummary;
}

const STATUS_LABELS: Record<AppointmentApiDto["status"], string> = {
  BOOKED: "Booked",
  CHECKED_IN: "Checked In",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_TONE: Record<AppointmentApiDto["status"], string> = {
  BOOKED: "bg-amber-500/12 text-amber-600 border-amber-500/25 dark:text-amber-400",
  CHECKED_IN: "bg-primary/12 text-primary border-primary/25",
  IN_CONSULTATION: "bg-primary/12 text-primary border-primary/25",
  COMPLETED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/12 text-destructive border-destructive/25",
  NO_SHOW: "bg-destructive/12 text-destructive border-destructive/25",
};

function Shell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto max-w-md p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </Card>
  );
}

interface AppointmentBoardProps {
  /** module path from config/modules.ts — drives title/description/RBAC gating */
  path: string;
  filter: (a: AppointmentApiDto) => boolean;
  emptyMessage: string;
  /** actions offered per row, based on its current status — either a plain status change or a custom handler (e.g. starting a consultation) */
  actions?: (
    a: AppointmentApiDto,
    helpers: {
      setStatus: (a: AppointmentApiDto, status: AppointmentApiDto["status"]) => Promise<void>;
      reload: () => void;
    },
  ) => { label: string; onClick: () => void | Promise<void> }[];
  /** rendered as a toolbar area above the list (e.g. a "New Walk-In" button) */
  toolbar?: (reload: () => void) => React.ReactNode;
}

/** Shared board for every "today's appointments" screen (walk-in desk, reception, queue) — real data via /api/clinic/appointments, no fake rows. */
export function AppointmentBoard({
  path,
  filter,
  emptyMessage,
  actions,
  toolbar,
}: AppointmentBoardProps) {
  const mod = moduleByPath(path);
  const { reasonForPath, plan, isPlatform } = usePermissions();
  const [appointments, setAppointments] = useState<AppointmentApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    apiFetch<AppointmentApiDto[]>("/api/clinic/appointments")
      .then(setAppointments)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load today's appointments."),
      );
  }

  useEffect(load, []);

  if (!mod) return null;
  const reason = reasonForPath(mod.path);

  if (reason === "unavailable") {
    return (
      <Shell
        icon={<ShieldAlert className="h-5 w-5" />}
        title={`${mod.title} isn't part of this organization`}
      >
        <p>Your organization's business type doesn't include clinic operations.</p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }
  if (reason === "plan") {
    return (
      <Shell icon={<Lock className="h-5 w-5" />} title={`${mod.title} is not in your plan`}>
        <p>
          Your organization is on the <strong>{plan.name}</strong> plan, which doesn't include{" "}
          {mod.title}.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }
  if (reason !== "ok") {
    return (
      <Shell icon={<ShieldAlert className="h-5 w-5 text-destructive" />} title="Access restricted">
        <p>
          {reason === "portal"
            ? "This area belongs to the MediUnivers product-owner console and is not part of your workspace."
            : `Your role does not have permission to open ${mod.title}.`}
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  async function setStatus(a: AppointmentApiDto, nextStatus: AppointmentApiDto["status"]) {
    try {
      await apiFetch(`/api/clinic/appointments/${a.id}/status`, {
        method: "PUT",
        data: { status: nextStatus },
      });
      toast.success(`${a.patient.fullName} — ${STATUS_LABELS[nextStatus].toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update this appointment.");
    }
  }

  const rows = (appointments ?? []).filter(filter);

  return (
    <div className="mu-page-enter min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{mod.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
        </div>
        {toolbar ? toolbar(load) : null}
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !appointments ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">{emptyMessage}</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            {rows.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  {a.tokenNumber ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {a.tokenNumber}
                    </span>
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.patient.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.patient.patientNumber} · Dr. {a.doctor.fullName}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_TONE[a.status]}>
                    {STATUS_LABELS[a.status]}
                  </Badge>
                  {(actions?.(a, { setStatus, reload: load }) ?? []).map((act) => (
                    <Button
                      key={act.label}
                      size="sm"
                      variant="outline"
                      onClick={() => act.onClick()}
                    >
                      {act.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
