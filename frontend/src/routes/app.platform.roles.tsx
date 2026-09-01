import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MODULES } from "@/config/modules";
import type { Action } from "@/lib/rbac";
import type { PlatformStaffApiDto, RoleApiDto } from "@/lib/types";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/app/platform/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — MediUnivers Platform" },
      {
        name: "description",
        content:
          "Platform staff roles — sales, support, finance, marketing and custom roles you define.",
      },
    ],
  }),
  component: PlatformRolesPage,
});

const ALL_ACTIONS: Action[] = ["view", "create", "update", "delete", "export", "approve"];
const PLATFORM_MODULES = MODULES.filter((m) => m.group === "platform");

function PlatformRolesPage() {
  const [roles, setRoles] = useState<RoleApiDto[] | null>(null);
  const [staff, setStaff] = useState<PlatformStaffApiDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleApiDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [actions, setActions] = useState<Action[]>(["view"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RoleApiDto | null>(null);

  function load() {
    Promise.all([
      apiFetch<RoleApiDto[]>("/api/public/roles?portal=PLATFORM"),
      apiFetch<PlatformStaffApiDto[]>("/api/platform/staff"),
    ])
      .then(([r, s]) => {
        setRoles(r);
        setStaff(s);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load roles."));
  }
  useEffect(load, []);

  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
    setPaths([]);
    setActions(["view"]);
    setError(null);
  }

  function openCreate() {
    reset();
    setOpen(true);
  }

  function openEdit(role: RoleApiDto) {
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setPaths(
      Object.entries(role.access).flatMap(([group, value]) =>
        value === "*"
          ? PLATFORM_MODULES.filter((m) => m.group === group).map((m) => m.path)
          : value,
      ),
    );
    setActions(role.actions.length ? (role.actions as Action[]) : ["view"]);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return setError("Role name is required.");
    if (!paths.length) return setError("Select at least one page this role can open.");

    const byGroup = new Map<string, string[]>();
    for (const p of paths) {
      const group = p.split("/")[0] as string;
      byGroup.set(group, [...(byGroup.get(group) ?? []), p]);
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || "Custom platform staff role.",
      actions,
      access: Array.from(byGroup.entries()).map(([moduleGroup, groupPaths]) => ({
        moduleGroup,
        wildcard: false,
        paths: groupPaths,
      })),
    };

    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/platform/roles/${editing.id}`, { method: "PUT", data: payload });
        toast.success(`Role "${name.trim()}" updated`);
      } else {
        await apiFetch("/api/platform/roles", { method: "POST", data: payload });
        toast.success(`Role "${name.trim()}" created`, {
          description: "Assign it from Users → New user.",
        });
      }
      setOpen(false);
      reset();
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this role. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/platform/roles/${deleting.id}`, { method: "DELETE" });
      toast.success(`Role "${deleting.name}" deleted`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete this role.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Built-in platform roles (Super Admin, Sales, Support, Finance, Marketing) are fixed and
            can't be edited here — build your own staff roles alongside them.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New role
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !roles ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const userCount = staff.filter((s) => s.roleCode === role.code).length;
            const pageCount = Object.entries(role.access).reduce(
              (n, [g, v]) =>
                n + (v === "*" ? MODULES.filter((m) => m.group === g).length : v.length),
              0,
            );
            return (
              <Card key={role.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {role.system ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{role.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {role.system ? "System role" : "Custom role"}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(role.access).map((g) => (
                    <Badge key={g} variant="outline" className="text-[10px] capitalize">
                      {g}
                    </Badge>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pageCount} page{pageCount === 1 ? "" : "s"} · {role.actions.join(", ")}
                </p>
                <p className="text-[11px] font-medium text-foreground">
                  {userCount} user{userCount === 1 ? "" : "s"} assigned
                </p>
                {!role.system ? (
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(role)}
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleting(role)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create a platform role"}</DialogTitle>
            <DialogDescription>
              Choose exactly which platform pages this role can open.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">
                  Role name<span className="ml-1 font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Billing Support"
                  className={cn(error && !name.trim() && "border-destructive")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this role does"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Allowed actions</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_ACTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={actions.includes(a)}
                      onCheckedChange={(v) =>
                        setActions((prev) => (v ? [...prev, a] : prev.filter((x) => x !== a)))
                      }
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Pages this role can open</Label>
              {(() => {
                const allSelected = PLATFORM_MODULES.every((m) => paths.includes(m.path));
                return (
                  <div className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">Platform</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setPaths((prev) =>
                            allSelected
                              ? prev.filter((p) => !PLATFORM_MODULES.some((m) => m.path === p))
                              : [...new Set([...prev, ...PLATFORM_MODULES.map((m) => m.path)])],
                          )
                        }
                      >
                        {allSelected ? "Clear" : "Select all"}
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PLATFORM_MODULES.map((m) => (
                        <label key={m.path} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={paths.includes(m.path)}
                            onCheckedChange={(v) =>
                              setPaths((prev) =>
                                v ? [...prev, m.path] : prev.filter((p) => p !== m.path),
                              )
                            }
                          />
                          <span className="truncate">{m.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save changes" : "Create role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. Blocked if any user is currently assigned this role.
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
