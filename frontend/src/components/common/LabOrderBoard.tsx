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

export interface LabOrderItemApiDto {
  id: number;
  testId: number;
  testName: string;
  sampleType: string;
}

export interface LabOrderApiDto {
  id: number;
  orderNumber: string;
  status:
    | "SAMPLE_PENDING"
    | "COLLECTED"
    | "PROCESSING"
    | "RESULT_READY"
    | "VERIFIED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED";
  patient: { id: number; patientNumber: string; fullName: string };
  doctorName: string | null;
  items: LabOrderItemApiDto[];
  createdAt: string;
}

const STATUS_LABELS: Record<LabOrderApiDto["status"], string> = {
  SAMPLE_PENDING: "Sample Pending",
  COLLECTED: "Collected",
  PROCESSING: "Processing",
  RESULT_READY: "Result Ready",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
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

interface LabOrderBoardProps {
  path: string;
  statuses: LabOrderApiDto["status"][];
  emptyMessage: string;
  actions?: (
    order: LabOrderApiDto,
    helpers: { reload: () => void },
  ) => { label: string; onClick: () => void | Promise<void> }[];
}

/** Shared board for lab order pipeline screens (samples, processing, review) — real data via /api/lab/orders, no fake rows. */
export function LabOrderBoard({ path, statuses, emptyMessage, actions }: LabOrderBoardProps) {
  const mod = moduleByPath(path);
  const { reasonForPath, plan, isPlatform } = usePermissions();
  const [orders, setOrders] = useState<LabOrderApiDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    apiFetch<LabOrderApiDto[]>("/api/lab/orders", { params: { status: statuses.join(",") } })
      .then(setOrders)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load lab orders."),
      );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on the joined value, not the array reference (a new literal each render)
  useEffect(load, [statuses.join(",")]);

  if (!mod) return null;
  const reason = reasonForPath(mod.path);

  if (reason === "unavailable") {
    return (
      <Shell
        icon={<ShieldAlert className="h-5 w-5" />}
        title={`${mod.title} isn't part of this organization`}
      >
        <p>Your organization's business type doesn't include laboratory operations.</p>
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

  return (
    <div className="mu-page-enter min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{mod.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !orders ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">{emptyMessage}</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            {orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{o.patient.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.orderNumber} · {o.patient.patientNumber} ·{" "}
                    {o.items.map((i) => i.testName).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                    {STATUS_LABELS[o.status]}
                  </Badge>
                  {(actions?.(o, { reload: load }) ?? []).map((act) => (
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
