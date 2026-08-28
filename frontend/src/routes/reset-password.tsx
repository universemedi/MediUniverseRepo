import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchPublic } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ResetSearch {
  token?: string | undefined;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token: typeof search["token"] === "string" ? (search["token"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset Password — MediUnivers" },
      { name: "description", content: "Create a new password for your MediUnivers account." },
    ],
  }),
  component: ResetPasswordPage,
});

interface FieldErrors {
  password?: string | undefined;
  confirmPassword?: string | undefined;
}

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  function validate(): boolean {
    const newErrors: FieldErrors = {};

    if (!password) {
      newErrors.password = "New password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    if (newErrors.password) {
      passwordRef.current?.focus();
      return false;
    }
    if (newErrors.confirmPassword) {
      confirmPasswordRef.current?.focus();
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!token) {
      setServerError("Reset token is missing or expired. Please request a new link.");
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetchPublic("/api/public/auth/reset-password", {
        method: "POST",
        data: {
          token,
          newPassword: password,
        },
      });
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to reset password. Link may be expired.",
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

        {success ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Password reset successfully
            </h1>
            <p className="text-sm text-muted-foreground">
              Your password has been updated. You can now sign in with your new credentials.
            </p>
            <div className="pt-2">
              <Button className="w-full" onClick={() => navigate({ to: "/login" })}>
                Go to sign in
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter and confirm your new account password below.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  New Password <span className="font-bold text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={passwordRef}
                    id="password"
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
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
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
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
                  Confirm Password <span className="font-bold text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={confirmPasswordRef}
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
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

              {serverError ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  {serverError}
                </p>
              ) : null}

              <Button type="submit" className="mt-2 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel and return to sign in
                </Link>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
