import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { MyProfileApiDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [{ title: "My Profile — MediUnivers" }],
  }),
  component: ProfilePage,
});

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

function toForm(p: MyProfileApiDto): FormState {
  return {
    fullName: p.fullName,
    email: p.email,
    phone: p.phone ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
  };
}

function validateField(key: keyof FormState, f: FormState): string | undefined {
  switch (key) {
    case "fullName":
      return f.fullName.trim() ? undefined : "Name is required.";
    case "email":
      if (!f.email.trim()) return "Email is required.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())
        ? undefined
        : "Enter a valid email address.";
    default:
      return undefined;
  }
}

const VALIDATED_FIELDS: (keyof FormState)[] = ["fullName", "email"];

function ProfilePage() {
  const [profile, setProfile] = useState<MyProfileApiDto | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldRefs = useRef<Partial<Record<keyof FormState, HTMLInputElement | null>>>({});

  useEffect(() => {
    apiFetch<MyProfileApiDto>("/api/me/profile")
      .then((p) => {
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load your profile."),
      );
  }, []);

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (touched[key]) {
        setFieldErrors((prevErrors) => ({ ...prevErrors, [key]: validateField(key, next) }));
      }
      return next;
    });
  }

  function handleBlur(key: keyof FormState) {
    if (!form) return;
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validateField(key, form) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    const errors: FieldErrors = {};
    for (const key of VALIDATED_FIELDS) {
      const message = validateField(key, form);
      if (message) errors[key] = message;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(VALIDATED_FIELDS.map((k) => [k, true])));
    const firstInvalid = VALIDATED_FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const updated = await apiFetch<MyProfileApiDto>("/api/me/profile", {
        method: "PUT",
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
        },
      });
      setProfile(updated);
      setForm(toForm(updated));
      toast.success("Profile updated");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save your profile. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">Update your own account details.</p>
        </div>
      </div>

      {loadError ? (
        <Card className="p-4 text-sm text-destructive">{loadError}</Card>
      ) : !profile || !form ? (
        <Card className="space-y-4 p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </Card>
      ) : (
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="p-name">
                Full name<span className="ml-1 font-bold text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                ref={(el) => {
                  fieldRefs.current.fullName = el;
                }}
                value={form.fullName}
                aria-invalid={!!(touched.fullName && fieldErrors.fullName)}
                className={cn(
                  touched.fullName &&
                    fieldErrors.fullName &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                onChange={(e) => setField("fullName", e.target.value)}
                onBlur={() => handleBlur("fullName")}
              />
              {touched.fullName && fieldErrors.fullName ? (
                <p className="text-xs font-medium text-destructive">{fieldErrors.fullName}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-email">
                Email<span className="ml-1 font-bold text-destructive">*</span>
              </Label>
              <Input
                id="p-email"
                ref={(el) => {
                  fieldRefs.current.email = el;
                }}
                type="email"
                value={form.email}
                aria-invalid={!!(touched.email && fieldErrors.email)}
                className={cn(
                  touched.email &&
                    fieldErrors.email &&
                    "border-destructive focus-visible:ring-destructive",
                )}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => handleBlur("email")}
              />
              {touched.email && fieldErrors.email ? (
                <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Phone</Label>
              <Input
                id="p-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-dob">Date of birth</Label>
              <Input
                id="p-dob"
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ChangePasswordCard />
    </div>
  );
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_PASSWORD_FORM: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function validatePasswordField(key: keyof PasswordForm, f: PasswordForm): string | undefined {
  switch (key) {
    case "currentPassword":
      return f.currentPassword ? undefined : "Current password is required.";
    case "newPassword":
      return f.newPassword.length >= 8 ? undefined : "New password must be at least 8 characters.";
    case "confirmPassword":
      return f.confirmPassword === f.newPassword ? undefined : "Passwords don't match.";
  }
}

const PASSWORD_FIELDS: (keyof PasswordForm)[] = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
];

function setOrClear(
  target: Partial<Record<keyof PasswordForm, string>>,
  key: keyof PasswordForm,
  value: string | undefined,
) {
  if (value) target[key] = value;
  else delete target[key];
}

function ChangePasswordCard() {
  const [form, setForm] = useState<PasswordForm>(EMPTY_PASSWORD_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PasswordForm, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof PasswordForm, HTMLInputElement | null>>>({});

  function setField(key: keyof PasswordForm, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (touched[key] || (key === "newPassword" && touched.confirmPassword)) {
        setFieldErrors((prevErrors) => {
          const nextErrors = { ...prevErrors };
          setOrClear(nextErrors, key, validatePasswordField(key, next));
          if (key === "newPassword" && touched.confirmPassword) {
            setOrClear(
              nextErrors,
              "confirmPassword",
              validatePasswordField("confirmPassword", next),
            );
          }
          return nextErrors;
        });
      }
      return next;
    });
  }

  function handleBlur(key: keyof PasswordForm) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setFieldErrors((prev) => ({ ...prev, [key]: validatePasswordField(key, form) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Partial<Record<keyof PasswordForm, string>> = {};
    for (const key of PASSWORD_FIELDS) {
      const message = validatePasswordField(key, form);
      if (message) errors[key] = message;
    }
    setFieldErrors(errors);
    setTouched(Object.fromEntries(PASSWORD_FIELDS.map((k) => [k, true])));
    const firstInvalid = PASSWORD_FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/me/change-password", {
        method: "POST",
        data: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm(EMPTY_PASSWORD_FORM);
      setTouched({});
      setFieldErrors({});
      toast.success("Password changed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Change password</h2>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="p-current-password">
            Current password<span className="ml-1 font-bold text-destructive">*</span>
          </Label>
          <Input
            id="p-current-password"
            ref={(el) => {
              fieldRefs.current.currentPassword = el;
            }}
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            aria-invalid={!!(touched.currentPassword && fieldErrors.currentPassword)}
            className={cn(
              touched.currentPassword &&
                fieldErrors.currentPassword &&
                "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(e) => setField("currentPassword", e.target.value)}
            onBlur={() => handleBlur("currentPassword")}
          />
          {touched.currentPassword && fieldErrors.currentPassword ? (
            <p className="text-xs font-medium text-destructive">{fieldErrors.currentPassword}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-new-password">
            New password<span className="ml-1 font-bold text-destructive">*</span>
          </Label>
          <Input
            id="p-new-password"
            ref={(el) => {
              fieldRefs.current.newPassword = el;
            }}
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            aria-invalid={!!(touched.newPassword && fieldErrors.newPassword)}
            className={cn(
              touched.newPassword &&
                fieldErrors.newPassword &&
                "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(e) => setField("newPassword", e.target.value)}
            onBlur={() => handleBlur("newPassword")}
          />
          {touched.newPassword && fieldErrors.newPassword ? (
            <p className="text-xs font-medium text-destructive">{fieldErrors.newPassword}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-confirm-password">
            Confirm new password<span className="ml-1 font-bold text-destructive">*</span>
          </Label>
          <Input
            id="p-confirm-password"
            ref={(el) => {
              fieldRefs.current.confirmPassword = el;
            }}
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            aria-invalid={!!(touched.confirmPassword && fieldErrors.confirmPassword)}
            className={cn(
              touched.confirmPassword &&
                fieldErrors.confirmPassword &&
                "border-destructive focus-visible:ring-destructive",
            )}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
          />
          {touched.confirmPassword && fieldErrors.confirmPassword ? (
            <p className="text-xs font-medium text-destructive">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Changing…" : "Change password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
