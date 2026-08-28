import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { moduleByPath } from "@/config/modules";
import { buildRows, type Row } from "@/lib/rows";
import { usePermissions } from "@/hooks/usePermissions";
import { PLANS } from "@/lib/plans";
import { DataTable } from "@/components/common/DataTable";
import { StatCards } from "@/components/common/StatCards";
import { ChartCard } from "@/components/common/ChartCard";
import { FormBuilder } from "@/components/form/FormBuilder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/$")({
  component: ModulePage,
});

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

function ModulePage() {
  const { _splat } = Route.useParams();
  const path = (_splat ?? "").replace(/\/$/, "");
  const mod = moduleByPath(path);
  const { reasonForPath, can, plan, isPlatform } = usePermissions();
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => (mod ? buildRows(mod) : []), [mod]);

  if (!mod) {
    return (
      <Shell icon={<ShieldAlert className="h-5 w-5" />} title="Page not found">
        <p>No module is registered at /app/{path}.</p>
        <Button asChild className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  const reason = reasonForPath(mod.path);

  if (reason === "unavailable") {
    return (
      <Shell
        icon={<ShieldAlert className="h-5 w-5" />}
        title={`${mod.title} isn't part of this organization`}
      >
        <p>
          Your organization's business type doesn't include {mod.title.toLowerCase()}. This isn't a
          plan limit — it means this organization doesn't run this kind of operation (for example, a
          clinic with no in-house pharmacy or laboratory).
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Shell>
    );
  }

  if (reason === "plan") {
    const upgrades = PLANS.filter((p) => p.modules.includes(mod.group as never));
    return (
      <Shell icon={<Lock className="h-5 w-5" />} title={`${mod.title} is not in your plan`}>
        <p>
          Your organization is on the <strong>{plan.name}</strong> plan. {mod.title} is available
          from {upgrades.map((p) => p.name).join(" / ") || "a higher plan"}.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/app/$" params={{ _splat: "org/subscription" }}>
              Upgrade subscription
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        </div>
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{mod.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
        </div>
        <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
          {isPlatform ? "Platform" : plan.name}
        </Badge>
      </div>

      {mod.stats?.length ? <StatCards stats={mod.stats} /> : null}

      {mod.charts?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {mod.charts.map((c) => (
            <ChartCard key={c.title} def={c} seedKey={mod.path} />
          ))}
        </div>
      ) : null}

      <DataTable
        id={mod.path}
        title={mod.title}
        rows={rows}
        columns={mod.columns}
        canCreate={can("create")}
        canUpdate={can("update")}
        canDelete={can("delete")}
        canExport={can("export")}
        createLabel={`New ${mod.singular}`}
        onCreate={() => {
          setEditing(null);
          setOpen(true);
        }}
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={(row) => {
          toast.success(`${mod.singular} deleted`, {
            description: String(row[mod.columns[0]!.key] ?? ""),
          });
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "New"} {mod.singular}
            </DialogTitle>
            <DialogDescription>{mod.description}</DialogDescription>
          </DialogHeader>
          <FormBuilder
            columns={mod.columns}
            {...(editing ? { initialValues: editing as Record<string, string> } : {})}
            submitLabel={editing ? "Save changes" : `Create ${mod.singular}`}
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              setOpen(false);
              toast.success(`${mod.singular} ${editing ? "updated" : "created"}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
