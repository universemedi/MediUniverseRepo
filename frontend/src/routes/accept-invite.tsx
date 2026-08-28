import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, ShieldAlert } from "lucide-react";
import { apiFetchPublic, ApiError } from "@/lib/api";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AcceptInviteSearch {
  token?: string | undefined;
}

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>): AcceptInviteSearch => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Accept your invitation — MediUnivers" },
      { name: "description", content: "Set your password to accept your MediUnivers invite." },
    ],
  }),
  component: AcceptInvitePage,
});

interface Preview {
  email: string;
  fullName: string;
  organizationName: string;
  roleName: string;
}

interface FieldErrors {
  password?: string | undefined;
  confirmPassword?: string | undefined;
}

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setLoadError("This invitation link is missing its token.");
      return;
    }
    apiFetchPublic<Preview>(`/api/public/invitations/${token}`)
      .then(setPreview)
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "This invitation link is invalid or has expired.",
        ),
      );
  }, [token]);

  function validate(): boolean {
    const err: FieldErrors = {};

    if (!password) {
      err.password = "Password is required.";
    } else if (password.length < 8) {
      err.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      err.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      err.confirmPassword = "Passwords do not match.";
    }

    setErrors(err);

    if (err.password) {
      passwordRef.current?.focus();
      return false;
    }
    if (err.confirmPassword) {
      confirmPasswordRef.current?.focus();
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetchPublic(`/api/public/invitations/${token}/accept`, {
        method: "POST",
        data: { password },
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't accept this invitation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md p-6 shadow-sm">
        <div className="mb-4">
          <Logo size="sm" />
        </div>

        {loadError ? (
          <div className="text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              Invitation not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="text-center space-y-4">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">You're all set</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been set. Sign in with{" "}
              <strong className="text-foreground">{preview?.email}</strong> to access your
              workspace.
            </p>
            <div className="pt-2">
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
                Go to sign in
              </Button>
            </div>
          </div>
        ) : !preview ? (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading your invitation…</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome, {preview.fullName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You've been invited to join{" "}
              <strong className="text-foreground">{preview.organizationName}</strong> as{" "}
              <strong className="text-foreground">{preview.roleName}</strong>. Create a password to
              finish setup.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Readonly Email */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-xs font-medium text-foreground">
                  Email Address
                </Label>
                <Input
                  id="invite-email"
                  value={preview.email}
                  disabled
                  className="bg-muted text-muted-foreground text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-password" className="text-xs font-medium text-foreground">
                  Create Password <span className="font-bold text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={passwordRef}
                    id="invite-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className={cn(
                      "pl-9 pr-9 text-sm transition-colors",
                      errors.password && "border-destructive focus-visible:ring-destructive",
                    )}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors(({ password: _, ...rest }) => rest);
                      }
                    }}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-[11px] font-medium text-destructive">{errors.password}</p>
                ) : null}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="invite-confirm" className="text-xs font-medium text-foreground">
                  Confirm Password <span className="font-bold text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={confirmPasswordRef}
                    id="invite-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    className={cn(
                      "pl-9 text-sm transition-colors",
                      errors.confirmPassword && "border-destructive focus-visible:ring-destructive",
                    )}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors(({ confirmPassword: _, ...rest }) => rest);
                      }
                    }}
                    disabled={submitting}
                  />
                </div>
                {errors.confirmPassword ? (
                  <p className="text-[11px] font-medium text-destructive">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="mt-2 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting password…
                  </>
                ) : (
                  "Set password & continue"
                )}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
