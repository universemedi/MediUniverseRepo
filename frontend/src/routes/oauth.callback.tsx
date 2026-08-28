import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  API_BASE_URL,
  OAUTH_CLIENT_ID,
  apiFetch,
  apiFetchPublic,
  saveTokens,
  type TokenSet,
} from "@/lib/api";
import { readAndClearPkceSession } from "@/lib/pkce";
import { useAppDispatch } from "@/store";
import { loginSuccess, type AuthUser } from "@/store/slices/authSlice";
import { hydrateFromOrganization } from "@/store/slices/tenantSlice";
import type { RoleKey } from "@/lib/rbac";
import type { MeResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CallbackSearch {
  code?: string | undefined;
  state?: string | undefined;
  error?: string | undefined;
  error_description?: string | undefined;
}

export const Route = createFileRoute("/oauth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => {
    const get = (key: string) =>
      typeof search[key] === "string" ? (search[key] as string) : undefined;
    return {
      code: get("code"),
      state: get("state"),
      error: get("error"),
      error_description: get("error_description"),
    };
  },
  component: OAuthCallbackPage,
});

async function exchangeCodeForTokens(code: string, verifier: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${window.location.origin}/oauth/callback`,
    client_id: OAUTH_CLIENT_ID,
    code_verifier: verifier,
  });

  return apiFetchPublic<Record<string, unknown>>("/oauth2/token", {
    method: "POST",
    data: body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).then((json) => ({
    accessToken: String(json["access_token"] ?? ""),
    refreshToken: json["refresh_token"] ? String(json["refresh_token"]) : undefined,
    expiresIn: typeof json["expires_in"] === "number" ? (json["expires_in"] as number) : undefined,
  }));
}

function OAuthCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      // 1. Check if OAuth server returned an error
      if (search.error) {
        setError(search.error_description ?? "Sign-in was cancelled or denied.");
        return;
      }

      if (!search.code) {
        setError("Missing authorization code. Please try signing in again.");
        return;
      }

      // 2. Retrieve PKCE session values
      let { verifier, state: storedState } = readAndClearPkceSession();
      const redirectPath = sessionStorage.getItem("mu_post_login_redirect") ?? "/app";
      sessionStorage.removeItem("mu_post_login_redirect");

      // 3. Fallback support for manual test URLs
      if (!verifier && search.state === "YwPzE5lPSWrZRyxQ") {
        verifier = "rS5_GVDiBfoSZD5LpXeh9Wtt4yGDKogiUJAY42nkjGSiXRTIk4wLLEIuWd7RJm9w";
        storedState = "YwPzE5lPSWrZRyxQ";
      }

      // 4. Validate PKCE verifier exists
      if (!verifier) {
        setError("Missing PKCE verifier in session. Please start sign-in from the login page.");
        return;
      }

      // 5. Validate CSRF state
      if (storedState && search.state && storedState !== search.state) {
        setError("State parameter mismatch (possible CSRF or expired session). Please try again.");
        return;
      }

      // 6. Perform Token Exchange and Hydrate User
      try {
        const tokens = await exchangeCodeForTokens(search.code, verifier);
        saveTokens(tokens);

        const me = await apiFetch<MeResponse>("/api/me");

        const rawOrg = me.organization as unknown as Record<string, unknown> | undefined;
        const resolvedOrgType =
          rawOrg?.["type"] ?? rawOrg?.["orgType"] ?? rawOrg?.["organizationType"];
        const resolvedPlanCode =
          rawOrg?.["planCode"] ??
          (typeof rawOrg?.["plan"] === "object" && rawOrg?.["plan"] !== null
            ? (rawOrg["plan"] as Record<string, unknown>)["code"]
            : undefined);

        const authUser: AuthUser = {
          id: String(me.userId),
          name: me.name,
          email: me.email,
          role: me.role.code as RoleKey,
          organization: me.organization?.name ?? "MediUnivers Platform",
          branch: me.branchName ?? "",
          ...(rawOrg?.["id"] != null ? { orgId: String(rawOrg["id"]) } : {}),
          ...(resolvedOrgType != null ? { orgType: String(resolvedOrgType) } : {}),
          ...(resolvedPlanCode != null ? { planCode: String(resolvedPlanCode) } : {}),
        };

        dispatch(
          loginSuccess({
            user: authUser,
            token: tokens.accessToken,
          }),
        );

        if (me.organization) {
          dispatch(hydrateFromOrganization(me.organization));
        }

        navigate({ to: redirectPath, replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong signing you in.");
      }
    }

    void run();
  }, [search, dispatch, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Sign-in didn't complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-5" onClick={() => navigate({ to: "/login" })}>
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Finishing sign-in…</p>
      </div>
    </div>
  );
}
