import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Plus, ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/app/org/users")({
  head: () => ({
    meta: [
      { title: "Users — MediUnivers Organization" },
      {
        name: "description",
        content: "Invite staff and assign role-based, branch-scoped access to your organization.",
      },
    ],
  }),
  component: UsersPage,
});

interface OrgUser {
  id: number;
  fullName: string;
  email: string;
  roleCode: string;
  roleName: string;
  branchId: number | null;
  branchName: string | null;
  status: "ACTIVE" | "INVITED" | "DISABLED";
}

interface OrgRole {
  code: string;
  name: string;
  description: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UsersPage() {
  const { isPlatform } = usePermissions();
  const branches = useAppSelector((s) => s.tenant.branchRecords);

  const [users, setUsers] = useState<OrgUser[] | null>(null);
  const [roles, setRoles] = useState<OrgRole[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [allBranches, setAllBranches] = useState(true);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);

  function load() {
    if (isPlatform) return;
    Promise.all([apiFetch<OrgUser[]>("/api/org/users"), apiFetch<OrgRole[]>("/api/org/roles")])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
        if (!roleCode && r.length) setRoleCode(r[0]!.code);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load users."));
  }

  useEffect(load, [isPlatform]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff accounts belong to a subscribed organization, not the platform console.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app">Back to dashboard</Link>
        </Button>
      </Card>
    );
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setFormError(null);
    setTouched(false);
    setAllBranches(true);
    setSelectedBranchIds([]);
    setBranchId(branches.find((b) => b.headOffice)?.id ?? branches[0]?.id ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!fullName.trim() || !roleCode) return setFormError("Full name and role are required.");
    if (!EMAIL_RE.test(email.trim())) return setFormError("Enter a valid email address.");
    if (!allBranches && selectedBranchIds.length === 0) {
      return setFormError("Pick at least one branch, or switch to all branches.");
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/org/users", {
        method: "POST",
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          roleCode,
          branchId,
          branchScope: allBranches ? "ALL_BRANCHES" : "SELECTED_BRANCHES",
          selectedBranchIds: allBranches ? [] : selectedBranchIds,
        },
      });
      toast.success(`Invitation sent to ${fullName.trim()}`, {
        description: "They'll set their own password when they accept it.",
      });
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Couldn't create this user. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resendInvitation(u: OrgUser) {
    setResendingId(u.id);
    try {
      await apiFetch(`/api/org/users/${u.id}/resend-invitation`, { method: "POST" });
      toast.success(`Invitation resent to ${u.fullName}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't resend this invitation.");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite staff and assign them a role — only roles built from your organization's
            currently enabled modules can be granted. They set their own password when they accept.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" /> New user
        </Button>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !users ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No staff added yet — click "New user" to invite your first team member.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {u.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">
                {u.roleName}
              </Badge>
              {u.branchName ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {u.branchName}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={
                  u.status === "ACTIVE"
                    ? "text-primary"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }
              >
                {u.status}
              </Badge>
              {u.status === "INVITED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resendingId === u.id}
                  onClick={() => resendInvitation(u)}
                >
                  <Mail className="h-3.5 w-3.5" /> {resendingId === u.id ? "Sending…" : "Resend"}
                </Button>
              ) : null}
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite a staff user</DialogTitle>
            <DialogDescription>
              They'll get a link to accept and set their own password — no password to hand out.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-name">Full name</Label>
                <Input
                  id="user-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={touched && !fullName.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    touched && !EMAIL_RE.test(email.trim()) ? "border-destructive" : undefined
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Primary branch</Label>
                <Select
                  value={branchId != null ? String(branchId) : ""}
                  onValueChange={(v) => setBranchId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={allBranches} onCheckedChange={(v) => setAllBranches(!!v)} />
                Access to all branches (now and any added later)
              </label>
              {!allBranches ? (
                <div className="grid gap-1.5 rounded-lg border border-border p-3 sm:grid-cols-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedBranchIds.includes(b.id)}
                        onCheckedChange={(v) =>
                          setSelectedBranchIds((prev) =>
                            v ? [...prev, b.id] : prev.filter((id) => id !== b.id),
                          )
                        }
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleCode} onValueChange={setRoleCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {(roles ?? []).map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {roles?.find((r) => r.code === roleCode)?.description}
              </p>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Plus className="h-4 w-4" /> {submitting ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
