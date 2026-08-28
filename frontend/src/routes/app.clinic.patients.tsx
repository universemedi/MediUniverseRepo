import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Plus, Search, ShieldAlert, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
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
}

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  gender: string | null;
  dateOfBirth: string | null;
  phone: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9 ()-]{8,18}$/;

function PatientsPage() {
  const { isPlatform, isUnavailable } = usePermissions();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const [viewing, setViewing] = useState<Patient | null>(null);
  const [family, setFamily] = useState<FamilyMember[] | null>(null);

  const unavailable = !isPlatform && isUnavailable("clinic");

  function load(term?: string) {
    if (isPlatform || unavailable) return;
    const params = term?.trim() ? { search: term.trim() } : {};
    apiFetch<Patient[]>("/api/clinic/patients", {
      method: "GET",
      params,
    })
      .then(setPatients)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load patients."),
      );
  }

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
    setFirstName("");
    setLastName("");
    setGender("");
    setDob("");
    setPhone("");
    setEmail("");
    setBloodGroup("");
    setAddress("");
    setError(null);
    setTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!firstName.trim()) return setError("First name is required.");
    if (!PHONE_RE.test(phone.trim())) return setError("Enter a valid phone number.");
    if (email.trim() && !EMAIL_RE.test(email.trim()))
      return setError("Enter a valid email address.");
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/clinic/patients", {
        method: "POST",
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          gender: gender || null,
          dateOfBirth: dob || null,
          phone: phone.trim(),
          email: email.trim() || null,
          bloodGroup: bloodGroup.trim() || null,
          address: address.trim() || null,
        },
      });
      toast.success(`${firstName.trim()} registered`);
      setOpen(false);
      resetForm();
      load(search);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't register this patient. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openProfile(p: Patient) {
    setViewing(p);
    setFamily(null);
    apiFetch<FamilyMember[]>(`/api/clinic/patients/${p.id}/family`, {
      method: "GET",
    })
      .then(setFamily)
      .catch(() => setFamily([]));
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
            </button>
          ))}
        </Card>
      )}

      {/* Register dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register a patient</DialogTitle>
            <DialogDescription>A patient number is generated automatically.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-first">First name</Label>
                <Input
                  id="p-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={touched && !firstName.trim() ? "border-destructive" : undefined}
                />
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
                <Label htmlFor="p-phone">Phone</Label>
                <Input
                  id="p-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={
                    touched && !PHONE_RE.test(phone.trim()) ? "border-destructive" : undefined
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={
                    touched && email.trim() && !EMAIL_RE.test(email.trim())
                      ? "border-destructive"
                      : undefined
                  }
                />
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
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Registering…" : "Register"}
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
                <DialogTitle className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" /> {viewing.firstName} {viewing.lastName ?? ""}
                </DialogTitle>
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
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p>{viewing.address ?? "—"}</p>
                </div>
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
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
