import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Pencil, Plus, Search, ShieldAlert, UserPlus, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/app/clinic/patients")({
  head: () => ({
    meta: [
      { title: "Patients — MediUnivers Clinic" },
      { name: "description", content: "Patient registration, profiles and family members." },
    ],
  }),
  component: PatientsPage,
});

interface Patient {
  id: number;
  patientNumber: string;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  address: string | null;
  status: string;
  branchId: number | null;
  branchName: string | null;
}

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
}

interface Branch {
  id: number;
  name: string;
  headOffice: boolean;
  status: string;
}

interface VisitAppointment {
  id: number;
  appointmentNumber: string;
  status: string;
  appointmentDate: string;
  reason: string | null;
  doctor: { fullName: string };
}

const RELATIONS = ["Spouse", "Child", "Parent", "Sibling", "Guardian", "Other"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ()-]{8,18}$/;

interface FieldErrors {
  firstName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
}

function PatientsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [viewing, setViewing] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<VisitAppointment[] | null>(null);
  const [family, setFamily] = useState<FamilyMember[] | null>(null);
  const [famName, setFamName] = useState("");
  const [famRelation, setFamRelation] = useState("");
  const [famPhone, setFamPhone] = useState("");
  const [famGender, setFamGender] = useState("");
  const [famDob, setFamDob] = useState("");
  const [famSubmitting, setFamSubmitting] = useState(false);
  const [famError, setFamError] = useState<string | null>(null);

  const [deactivating, setDeactivating] = useState<Patient | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [invitingPortal, setInvitingPortal] = useState(false);

  const unavailable = !isPlatform && isUnavailable("clinic");

  function load(term?: string) {
    if (isPlatform || unavailable) return;
    const params = term?.trim() ? { search: term.trim() } : {};
    apiFetch<Patient[]>("/api/clinic/patients", { method: "GET", params })
      .then(setPatients)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load patients."),
      );
  }

  useEffect(() => {
    if (isPlatform || unavailable) return;
    apiFetch<Branch[]>("/api/org/branches")
      .then((b) => setBranches(b.filter((br) => br.status === "ACTIVE")))
      .catch(() => setBranches([]));
  }, [isPlatform, unavailable]);

  useEffect(load, [isPlatform, unavailable]);

  if (isPlatform) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-4 text-lg font-semibold">Organization area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Patient records belong to a subscribed organization.
        </p>
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
        <h1 className="mt-4 text-lg font-semibold">Clinic isn't part of this organization</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your organization's business type or plan doesn't include the Clinic module.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/app/$" params={{ _splat: "org/modules" }}>
            Configure modules
          </Link>
        </Button>
      </Card>
    );
  }

  function resetForm() {
    setEditing(null);
    setFirstName("");
    setLastName("");
    setGender("");
    setDob("");
    setPhone("");
    setEmail("");
    setBloodGroup("");
    setAddress("");
    setBranchId("");
    setError(null);
    setFieldErrors({});
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setFirstName(p.firstName);
    setLastName(p.lastName ?? "");
    setGender(p.gender ?? "");
    setDob(p.dateOfBirth ?? "");
    setPhone(p.phone ?? "");
    setEmail(p.email ?? "");
    setBloodGroup(p.bloodGroup ?? "");
    setAddress(p.address ?? "");
    setBranchId(p.branchId != null ? String(p.branchId) : "");
    setError(null);
    setFieldErrors({});
    setViewing(null);
    setOpen(true);
  }

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (!firstName.trim()) errors.firstName = "First name is required.";
    if (!PHONE_RE.test(phone.trim())) errors.phone = "Enter a valid phone number.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateFields()) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        gender: gender || null,
        dateOfBirth: dob || null,
        phone: phone.trim(),
        email: email.trim() || null,
        bloodGroup: bloodGroup.trim() || null,
        address: address.trim() || null,
        branchId: branchId ? Number(branchId) : null,
      };
      if (editing) {
        await apiFetch(`/api/clinic/patients/${editing.id}`, { method: "PUT", data: body });
        toast.success(`${firstName.trim()} updated`);
      } else {
        await apiFetch("/api/clinic/patients", { method: "POST", data: body });
        toast.success(`${firstName.trim()} registered`);
      }
      setOpen(false);
      resetForm();
      load(search);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save this patient. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openProfile(p: Patient) {
    setViewing(p);
    setFamily(null);
    setVisits(null);
    setFamName("");
    setFamRelation("");
    setFamPhone("");
    setFamGender("");
    setFamDob("");
    setFamError(null);
    apiFetch<FamilyMember[]>(`/api/clinic/patients/${p.id}/family`, {
      method: "GET",
    })
      .then(setFamily)
      .catch(() => setFamily([]));
    apiFetch<VisitAppointment[]>(`/api/clinic/appointments/patient/${p.id}`, {
      method: "GET",
    })
      .then(setVisits)
      .catch(() => setVisits([]));
  }

  async function addFamilyMember(e: React.FormEvent) {
    e.preventDefault();
    if (!viewing) return;
    if (!famName.trim() || !famRelation) {
      setFamError("Name and relation are required.");
      return;
    }
    setFamError(null);
    setFamSubmitting(true);
    try {
      const member = await apiFetch<FamilyMember>(`/api/clinic/patients/${viewing.id}/family`, {
        method: "POST",
        data: {
          name: famName.trim(),
          relation: famRelation,
          phone: famPhone.trim() || null,
          gender: famGender || null,
          dateOfBirth: famDob || null,
        },
      });
      setFamily((prev) => (prev ? [...prev, member] : [member]));
      setFamName("");
      setFamRelation("");
      setFamPhone("");
      setFamGender("");
      setFamDob("");
      toast.success(`${member.name} added`);
    } catch (err) {
      setFamError(err instanceof ApiError ? err.message : "Couldn't add this family member.");
    } finally {
      setFamSubmitting(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    const patient = deactivating;
    setDeactivating(null);
    try {
      await apiFetch(`/api/clinic/patients/${patient.id}`, { method: "DELETE" });
      toast.success(`${patient.firstName} deactivated`);
      setViewing(null);
      load(search);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate this patient.");
    }
  }

  async function reactivatePatient(p: Patient) {
    setStatusBusy(true);
    try {
      await apiFetch(`/api/clinic/patients/${p.id}`, {
        method: "PUT",
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          phone: p.phone,
          email: p.email,
          bloodGroup: p.bloodGroup,
          address: p.address,
          branchId: p.branchId,
          status: "ACTIVE",
        },
      });
      toast.success(`${p.firstName} reactivated`);
      setViewing({ ...p, status: "ACTIVE" });
      load(search);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't reactivate this patient.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function invitePortal(p: Patient) {
    setInvitingPortal(true);
    try {
      await apiFetch(`/api/clinic/patients/${p.id}/invite-portal`, { method: "POST" });
      toast.success(`Portal invitation sent to ${p.email}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't send the portal invitation.");
    } finally {
      setInvitingPortal(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration, profiles and family members.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Register patient
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or patient no."
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
        />
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !patients ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No patients yet — click "Register patient" to add the first one.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => openProfile(p)}
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {p.firstName[0]}
                  {p.lastName?.[0] ?? ""}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {p.firstName} {p.lastName ?? ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.patientNumber} · {p.phone ?? "No phone"}
                </p>
              </div>
              {p.gender ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {p.gender}
                </Badge>
              ) : null}
              {p.bloodGroup ? <Badge variant="outline">{p.bloodGroup}</Badge> : null}
              {p.status !== "ACTIVE" ? (
                <Badge
                  variant="outline"
                  className="border-destructive/25 bg-destructive/10 text-destructive"
                >
                  {p.status}
                </Badge>
              ) : null}
            </button>
          ))}
        </Card>
      )}

      {/* Register/Edit dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit ${editing.firstName} ${editing.lastName ?? ""}`
                : "Register a patient"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "The patient number stays the same."
                : "A patient number is generated automatically."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-first">
                  First name <span className="font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-first"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) setFieldErrors(({ firstName: _, ...rest }) => rest);
                  }}
                  className={cn(fieldErrors.firstName && "border-destructive")}
                />
                {fieldErrors.firstName ? (
                  <p className="text-[11px] font-medium text-destructive">
                    {fieldErrors.firstName}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-last">Last name</Label>
                <Input id="p-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-dob">Date of birth</Label>
                <Input
                  id="p-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">
                  Phone <span className="font-bold text-destructive">*</span>
                </Label>
                <Input
                  id="p-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors(({ phone: _, ...rest }) => rest);
                  }}
                  placeholder="+91 98765 43210"
                  className={cn(fieldErrors.phone && "border-destructive")}
                />
                {fieldErrors.phone ? (
                  <p className="text-[11px] font-medium text-destructive">{fieldErrors.phone}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(({ email: _, ...rest }) => rest);
                  }}
                  className={cn(fieldErrors.email && "border-destructive")}
                />
                {fieldErrors.email ? (
                  <p className="text-[11px] font-medium text-destructive">{fieldErrors.email}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>Blood group</Label>
                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-address">Address</Label>
                <Input
                  id="p-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              {branches.length > 1 ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Branch</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No branch set" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                          {b.headOffice ? " (Head office)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editing
                    ? "Saving…"
                    : "Registering…"
                  : editing
                    ? "Save changes"
                    : "Register"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {viewing ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 pr-6">
                  <DialogTitle className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" /> {viewing.firstName} {viewing.lastName ?? ""}
                    {viewing.status !== "ACTIVE" ? (
                      <Badge
                        variant="outline"
                        className="border-destructive/25 bg-destructive/10 text-[10px] text-destructive"
                      >
                        {viewing.status}
                      </Badge>
                    ) : null}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(viewing)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {viewing.email ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={invitingPortal}
                        onClick={() => invitePortal(viewing)}
                      >
                        Invite to portal
                      </Button>
                    ) : null}
                    {viewing.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeactivating(viewing)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={statusBusy}
                        onClick={() => reactivatePatient(viewing)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
                <DialogDescription>{viewing.patientNumber}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p>{viewing.phone ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p>{viewing.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p>{viewing.gender ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blood group</p>
                  <p>{viewing.bloodGroup ?? "—"}</p>
                </div>
                {branches.length > 1 ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Branch</p>
                    <p>{viewing.branchName ?? "—"}</p>
                  </div>
                ) : null}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p>{viewing.address ?? "—"}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="mb-2 text-sm font-medium">Visit history</p>
                {!visits ? (
                  <Skeleton className="h-10 rounded-md" />
                ) : visits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No appointments yet.</p>
                ) : (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                    {visits.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate">
                            {v.appointmentDate} · Dr. {v.doctor.fullName}
                          </p>
                          {v.reason ? (
                            <p className="truncate text-xs text-muted-foreground">{v.reason}</p>
                          ) : null}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {v.status.replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Users className="h-3.5 w-3.5" /> Family members
                </p>
                {!family ? (
                  <Skeleton className="h-10 rounded-md" />
                ) : family.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No family members linked yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {family.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
                      >
                        <span>{f.name}</span>
                        <Badge variant="outline">{f.relation}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={addFamilyMember} noValidate className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Name"
                      value={famName}
                      onChange={(e) => setFamName(e.target.value)}
                    />
                    <Select value={famRelation} onValueChange={setFamRelation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Phone (optional)"
                      value={famPhone}
                      onChange={(e) => setFamPhone(e.target.value)}
                    />
                    <Select value={famGender} onValueChange={setFamGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Gender (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      placeholder="Date of birth"
                      className="col-span-2"
                      value={famDob}
                      onChange={(e) => setFamDob(e.target.value)}
                    />
                  </div>
                  {famError ? <p className="text-xs text-destructive">{famError}</p> : null}
                  <Button type="submit" size="sm" variant="outline" disabled={famSubmitting}>
                    <UserPlus className="h-3.5 w-3.5" />{" "}
                    {famSubmitting ? "Adding…" : "Add family member"}
                  </Button>
                </form>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivating} onOpenChange={(v) => !v && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {deactivating?.firstName} {deactivating?.lastName ?? ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their record and history stay intact — this just marks them Inactive. You can
              reactivate them from this same profile at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
