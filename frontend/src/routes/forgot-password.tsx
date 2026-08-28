import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetchPublic } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — MediUnivers" },
      { name: "description", content: "Reset your MediUnivers console password." },
    ],
  }),
  component: ForgotPasswordPage,
});

interface FieldErrors {
  email?: string | undefined;
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);

  function validate(): boolean {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: "Email is required." });
      emailRef.current?.focus();
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrors({ email: "Please enter a valid email address." });
      emailRef.current?.focus();
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetchPublic("/api/public/auth/forgot-password", {
        method: "POST",
        data: { email: email.trim() },
      });
      setSentSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to send reset link. Try again.");
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

        {sentSuccess ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a password reset link to <strong className="text-foreground">{email}</strong>.
              The link expires in 15 minutes.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Forgot password?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your verified email address and we'll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground">
                  Registered Email <span className="font-bold text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    placeholder="name@organization.com"
                    className={cn(
                      "pl-9 text-sm transition-colors",
                      errors.email && "border-destructive focus-visible:ring-destructive",
                    )}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors(({ email: _, ...rest }) => rest);
                      }
                    }}
                    disabled={submitting}
                    autoComplete="email"
                  />
                </div>
                {errors.email ? (
                  <p className="text-[11px] font-medium text-destructive">{errors.email}</p>
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
                    Sending link…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
