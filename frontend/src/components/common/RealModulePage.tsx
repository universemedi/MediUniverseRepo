import { useEffect, useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@/config/types";
import type { Row } from "@/lib/rows";
import { moduleByPath } from "@/config/modules";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch, ApiError } from "@/lib/api";
import { DataTable } from "@/components/common/DataTable";
import { FormBuilder } from "@/components/form/FormBuilder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@tanstack/react-router";

interface RealModulePageProps<T> {
  /** module path from config/modules.ts, e.g. "platform/coupons" — drives title/description/RBAC gating */
  path: string;
  /** REST base path this module's data lives at, e.g. "/api/platform/coupons" */
  basePath: string;
  columns: ColumnDef[];
  toRow: (item: T) => Row;
  /** omit to render this module as list-only (no "New" button) */
  toCreateBody?: (values: Record<string, string>) => unknown;
  /** omit to render rows as non-editable */
  toUpdateBody?: (values: Record<string, string>, row: Row) => unknown;
  /** false hides the delete action even when the role would otherwise allow it (e.g. append-only/transactional records) */
  supportsDelete?: boolean;
  /** Extra row actions between Edit and Delete — e.g. "Share via email". */
  rowActions?: (row: Row) => { label: string; icon: React.ReactNode; onClick: () => void }[];
  /** Row-level override that disables Edit/Delete regardless of role — e.g. a platform default record this org can use but not modify. */
  isRowLocked?: (row: Row) => boolean;
}

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

/** Real, persisted-data equivalent of the fake-data catch-all (routes/app.$.tsx) — same DataTable/FormBuilder shell and the same full RBAC/plan/org-type gating, but backed by real apiFetch calls instead of buildRows(). */
export function RealModulePage<T>({
  path,
  basePath,
  columns,
  toRow,
  toCreateBody,
  toUpdateBody,
  supportsDelete = true,
  rowActions,
  isRowLocked,
}: RealModulePageProps<T>) {
  const mod = moduleByPath(path);
  const { reasonForPath, can, plan, isPlatform } = usePermissions();
  const [items, setItems] = useState<T[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  function load() {
    apiFetch<T[]>(basePath)
      .then(setItems)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load this data."),
      );
  }

  useEffect(load, [basePath]);

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
        <p>Your organization's business type doesn't include {mod.title.toLowerCase()}.</p>
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

  const canCreate = can("create") && Boolean(toCreateBody);
  const canUpdate = can("update") && Boolean(toUpdateBody);
  const canDelete = can("delete") && supportsDelete;

  async function handleSubmit(values: Record<string, string>) {
    if (editing && isRowLocked?.(editing)) return;
    if (editing && toUpdateBody) {
      await apiFetch(`${basePath}/${editing.id}`, {
        method: "PUT",
        data: toUpdateBody(values, editing),
      });
      toast.success(`${mod!.singular} updated`);
    } else if (toCreateBody) {
      await apiFetch(basePath, { method: "POST", data: toCreateBody(values) });
      toast.success(`${mod!.singular} created`);
    }
    setOpen(false);
    setEditing(null);
    load();
  }

  async function confirmDelete() {
    if (!deleting || isRowLocked?.(deleting)) return;
    try {
      await apiFetch(`${basePath}/${deleting.id}`, { method: "DELETE" });
      toast.success(`${mod!.singular} removed`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove this record.");
      setDeleting(null);
    }
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

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : !items ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <DataTable
          id={mod.path}
          title={mod.title}
          rows={items.map(toRow)}
          columns={columns}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
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
          onDelete={(row) => setDeleting(row)}
          {...(rowActions ? { rowActions } : {})}
          {...(isRowLocked ? { isRowLocked } : {})}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "New"} {mod.singular}
            </DialogTitle>
            <DialogDescription>{mod.description}</DialogDescription>
          </DialogHeader>
          <FormBuilder
            columns={columns}
            {...(editing ? { initialValues: editing as unknown as Record<string, string> } : {})}
            submitLabel={editing ? "Save changes" : `Create ${mod.singular}`}
            onCancel={() => setOpen(false)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {mod.singular.toLowerCase()}
              {deleting ? ` "${deleting[columns[0]?.key ?? "id"]}"` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be available for use. If this type of record supports a Status
              field, you can restore it later by editing that status back to Active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
