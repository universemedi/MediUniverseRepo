import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Lock, Pencil, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MODULES } from "@/config/modules";
import type { Action } from "@/lib/rbac";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
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

export const Route = createFileRoute("/app/org/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — MediUnivers Organization" },
      {
        name: "description",
        content:
          "Create doctor, reception, pharmacy and lab roles from the modules your subscription unlocks.",
      },
    ],
  }),
  component: RolesPage,
});

const ALL_ACTIONS: Action[] = ["view", "create", "update", "delete", "export", "approve"];
const GROUP_LABEL: Record<string, string> = {
  org: "Organization",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  crm: "Patient CRM",
  cms: "Website & CMS",
};
const TENANT_GROUPS = ["clinic", "pharmacy", "lab", "crm", "cms"] as const;

interface ApiRole {
  id: number;
  code: string;
  name: string;
  description: string;
  system: boolean;
  organizationId: number | null;
  actions: string[];
  access: Record<string, "*" | string[]>;
}

interface OrgModuleStatus {
  group: "CLINIC" | "PHARMACY" | "LAB" | "CRM" | "CMS";
  enabled: boolean;
}

function RolesPage() {
  const { isPlatform, roleDef } = usePermissions();
  const [roles, setRoles] = useState<ApiRole[] | null>(null);
  const [enabledGroups, setEnabledGroups] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [actions, setActions] = useState<Action[]>(["view"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiRole | null>(null);

  const canManage = !isPlatform && ["ORG_OWNER", "ORG_ADMIN"].includes(roleDef.key);

  function load() {
    if (isPlatform) return;
    Promise.all([
      apiFetch<ApiRole[]>("/api/org/roles"),
      apiFetch<OrgModuleStatus[]>("/api/org/modules"),
    ])
      .then(([r, m]) => {
        setRoles(r);
        setEnabledGroups(m.filter((x) => x.enabled).map((x) => x.group.toLowerCase()));
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load roles."));
  }

  useEffect(load, [isPlatform]);

  // Only modules the org actually has enabled right now (business type × active plan) —
  // NOT just "in the plan", which used to let a clinic-only org grant Pharmacy pages.
  const entitledGroups = useMemo(
    () => TENANT_GROUPS.filter((g) => (enabledGroups ?? []).includes(g)),
    [enabledGroups],
  );
  const lockedGroups = TENANT_GROUPS.filter((g) => !(enabledGroups ?? []).includes(g));

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform staff manage roles under MediUnivers Control → Roles.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
    setPaths([]);
    setActions(["view"]);
    setError(null);
    setNameError(null);
  }

  function openEdit(role: ApiRole) {
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setActions(role.actions.map((a) => a.toLowerCase()) as Action[]);
    const expandedPaths: string[] = [];
    for (const [group, value] of Object.entries(role.access)) {
      if (value === "*") {
        expandedPaths.push(...MODULES.filter((m) => m.group === group).map((m) => m.path));
      } else {
        expandedPaths.push(...value);
      }
    }
    setPaths(expandedPaths);
    setError(null);
    setNameError(null);
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) return setNameError("Role name is required.");
    setNameError(null);
    if (!paths.length) return setError("Select at least one page this role can open.");

    const byGroup = new Map<string, string[]>();
    for (const p of paths) {
      const group = p.split("/")[0] as string;
      byGroup.set(group, [...(byGroup.get(group) ?? []), p]);
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || "Custom role created by the organization admin.",
        actions,
        access: Array.from(byGroup.entries()).map(([moduleGroup, groupPaths]) => ({
          moduleGroup,
          wildcard: false,
          paths: groupPaths,
        })),
      };
      if (editing) {
        await apiFetch(`/api/org/roles/${editing.id}`, { method: "PUT", data: body });
        toast.success(`Role "${name.trim()}" updated`);
      } else {
        await apiFetch("/api/org/roles", { method: "POST", data: body });
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
    const role = deleting;
    setDeleting(null);
    try {
      await apiFetch(`/api/org/roles/${role.id}`, { method: "DELETE" });
      toast.success(`Role "${role.name}" removed`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't remove this role.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build your own staff roles — doctors, reception, pharmacists, lab techs — from the
            modules your organization currently has <strong>enabled</strong>.
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New role
          </Button>
        ) : null}
      </div>

      {lockedGroups.length ? (
        <Card className="flex flex-wrap items-center gap-2 border-dashed p-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Not enabled yet:
          {lockedGroups.map((g) => (
            <Badge key={g} variant="outline" className="text-[10px]">
              {GROUP_LABEL[g]}
            </Badge>
          ))}
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link to="/app/$" params={{ _splat: "org/modules" }}>
              Configure modules
            </Link>
          </Button>
        </Card>
      ) : null}

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
            const pageCount = Object.entries(role.access).reduce(
              (n, [g, v]) =>
                n + (v === "*" ? MODULES.filter((m) => m.group === g).length : v.length),
              0,
            );
            return (
              <Card key={role.code} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{role.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {role.system ? "System role" : "Custom role"}
                    </p>
                  </div>
                  {canManage && !role.system ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => openEdit(role)}
                        aria-label={`Edit ${role.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(role)}
                        aria-label={`Delete ${role.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(role.access).map((g) => (
                    <Badge
                      key={g}
                      variant="outline"
                      className={
                        (enabledGroups ?? []).includes(g) || g === "org" || g === "patient"
                          ? ""
                          : "opacity-50 line-through"
                      }
                    >
                      {GROUP_LABEL[g] ?? g}
                    </Badge>
                  ))}
                </div>
                <p className="mt-auto text-[11px] text-muted-foreground">
                  {pageCount} page{pageCount === 1 ? "" : "s"} · {role.actions.join(", ")}
                </p>
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
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Create a role"}</DialogTitle>
            <DialogDescription>
              Only pages from currently enabled modules can be granted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">
                  Role name <span className="font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Senior Receptionist"
                  className={cn(nameError && "border-destructive")}
                />
                {nameError ? (
                  <p className="text-[11px] font-medium text-destructive">{nameError}</p>
                ) : null}
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
              {entitledGroups.map((g) => {
                const items = MODULES.filter((m) => m.group === g);
                const allSelected = items.every((m) => paths.includes(m.path));
                return (
                  <div key={g} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">{GROUP_LABEL[g]}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          setPaths((prev) =>
                            allSelected
                              ? prev.filter((p) => !items.some((m) => m.path === p))
                              : [...new Set([...prev, ...items.map((m) => m.path)])],
                          )
                        }
                      >
                        {allSelected ? "Clear" : "Select all"}
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((m) => (
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
              })}
              {!entitledGroups.length ? (
                <p className="text-sm text-muted-foreground">
                  No modules are enabled for this organization yet — Configure Modules first.
                </p>
              ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={submitting}>
                {submitting
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                    ? "Save changes"
                    : "Create role"}
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
              Any staff currently assigned this role will need a new one first — reassign them
              before deleting if this fails.
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
