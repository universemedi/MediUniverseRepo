import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  API_BASE_URL,
  OAUTH_CLIENT_ID,
  apiFetchPublic,
  clearTokens,
  resolveUploadUrl,
} from "@/lib/api";
import { useOrgBranding } from "@/lib/orgDomain";
import { useDynamicSeo } from "@/lib/useDynamicSeo";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  storePkceSession,
} from "@/lib/pkce";
import { cn } from "@/lib/utils";

interface LoginSearch {
  redirect?: string | undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const raw = search["redirect"];
    return typeof raw === "string" && raw.startsWith("/app")
      ? { redirect: raw as string }
      : { redirect: undefined };
  },
  head: () => ({
    meta: [
      { title: "Sign in — MediUnivers" },
      {
        name: "description",
        content: "Sign in to your MediUnivers healthcare operations console.",
      },
    ],
  }),
  component: LoginPage,
});

interface FieldErrors {
  username?: string | undefined;
  password?: string | undefined;
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { branding } = useOrgBranding();
  useDynamicSeo(
    branding ? `Sign in — ${branding.name}` : null,
    branding ? `Sign in to your ${branding.name} account.` : null,
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function validateFields(): boolean {
    const newErrors: FieldErrors = {};
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      newErrors.username = "Email / Username is required.";
    } else if (
      trimmedUsername.includes("@") &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUsername)
    ) {
      newErrors.username = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 4) {
      newErrors.password = "Password must be at least 4 characters.";
    }

    setErrors(newErrors);

    if (newErrors.username) {
      usernameRef.current?.focus();
      return false;
    }

    if (newErrors.password) {
      passwordRef.current?.focus();
      return false;
    }

    return true;
  }

  async function handleFormLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateFields()) {
      return;
    }

    setSubmitting(true);
    clearTokens();

    try {
      // 1. Authenticate through the shared Axios client.
      try {
        await apiFetchPublic("/api/public/auth/login", {
          method: "POST",
          data: {
            username: username.trim(),
            password,
          },
        });
      } catch (error) {
        setErrors({ username: " ", password: " " });
        passwordRef.current?.focus();
        throw error;
      }

      // 2. Generate PKCE parameters
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      const state = generateState();

      storePkceSession(verifier, state);
      sessionStorage.setItem("mu_post_login_redirect", redirect ?? "/app");

      // 3. Complete authorization handoff directly to OAuth callback
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const params = new URLSearchParams({
        response_type: "code",
        client_id: OAUTH_CLIENT_ID,
        scope: "openid profile",
        redirect_uri: redirectUri,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });

      window.location.replace(`${API_BASE_URL}/oauth2/authorize?${params.toString()}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to sign in. Check backend service.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Branding Column — an org's own domain shows their own logo/name/color instead of
          MediUnivers' own, so "sign in through your own website" actually feels like it. */}
      <div
        className={cn(
          "relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex",
          !branding && "bg-primary",
        )}
        style={branding ? { backgroundColor: branding.primaryColor } : undefined}
      >
        <div className="flex items-center gap-2 text-lg font-semibold [&_svg]:text-primary-foreground">
          {branding?.logoUrl ? (
            <img
              src={resolveUploadUrl(branding.logoUrl)}
              alt={branding.name}
              className="h-8 w-8 rounded-lg bg-primary-foreground/15 object-cover p-1"
            />
          ) : (
            <span className="h-8 w-8 overflow-hidden rounded-lg bg-primary-foreground/15 p-1">
              <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
                <path
                  d="M16 7v18M7 16h18"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}
          {branding?.name ?? "MediUnivers"}
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            {branding
              ? (branding.tagline ?? `Sign in to your ${branding.name} console.`)
              : "Healthcare operations, clinics, pharmacies and laboratories in one place."}
          </h1>
          {branding ? null : (
            <p className="max-w-sm text-sm opacity-80">
              Secure OAuth2 authentication with role-based dashboard routing.
            </p>
          )}
        </div>
        <p className="text-xs opacity-70">
          {branding
            ? "Powered by MediUnivers"
            : "Backend-authenticated · OAuth2 & PKCE · JWT session"}
        </p>
      </div>

      {/* Form Column */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 shadow-sm">
          <div className="mb-4 lg:hidden">
            {branding?.logoUrl ? (
              <img
                src={resolveUploadUrl(branding.logoUrl)}
                alt={branding.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <Logo size="sm" />
            )}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {branding ? `Sign in to ${branding.name}` : "Sign in"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your account credentials to access your console.
          </p>

          <form onSubmit={handleFormLogin} noValidate className="mt-6 space-y-4">
            {/* Email / Username Input */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-foreground">
                Email / Username <span className="font-bold text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={usernameRef}
                  id="username"
                  type="text"
                  placeholder="name@organization.com"
                  className={cn(
                    "pl-9 text-sm transition-colors",
                    errors.username && "border-destructive focus-visible:ring-destructive",
                  )}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) {
                      setErrors(({ username: _, ...rest }) => rest);
                    }
                  }}
                  disabled={submitting}
                  autoComplete="username"
                />
              </div>
              {errors.username && errors.username.trim() ? (
                <p className="text-[11px] font-medium text-destructive">{errors.username}</p>
              ) : null}
            </div>

            {/* Password Input with Forgot Password Link */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  Password <span className="font-bold text-destructive">*</span>
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
                  autoComplete="current-password"
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
              {errors.password && errors.password.trim() ? (
                <p className="text-[11px] font-medium text-destructive">{errors.password}</p>
              ) : null}
            </div>

            {formError ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {formError}
              </p>
            ) : null}

            <Button type="submit" className="mt-2 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
