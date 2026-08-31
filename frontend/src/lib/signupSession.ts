/**
 * Carries the just-created organization's id + signup token from /subscribe
 * (account creation) to /subscribe/plans (plan purchase) across a real page
 * navigation — sessionStorage rather than the URL, since the token
 * shouldn't sit in browser history.
 */

const KEYS = {
  orgId: "mu_signup_org_id",
  orgCode: "mu_signup_org_code",
  token: "mu_signup_token",
  preselectPlan: "mu_signup_preselect_plan",
} as const;

export interface SignupSession {
  orgId: number;
  orgCode: string;
  token: string;
}

export interface SignupResult {
  organizationId: number;
  organizationCode: string;
  signupToken: string;
  status: string;
}

export function storeSignupSession(result: SignupResult, preselectPlan?: string) {
  sessionStorage.setItem(KEYS.orgId, String(result.organizationId));
  sessionStorage.setItem(KEYS.orgCode, result.organizationCode);
  sessionStorage.setItem(KEYS.token, result.signupToken);
  if (preselectPlan) sessionStorage.setItem(KEYS.preselectPlan, preselectPlan);
}

export function readSignupSession(): {
  session: SignupSession | null;
  preselectPlan: string | null;
} {
  const orgId = sessionStorage.getItem(KEYS.orgId);
  const orgCode = sessionStorage.getItem(KEYS.orgCode);
  const token = sessionStorage.getItem(KEYS.token);
  const preselectPlan = sessionStorage.getItem(KEYS.preselectPlan);
  const session = orgId && orgCode && token ? { orgId: Number(orgId), orgCode, token } : null;
  return { session, preselectPlan };
}

export function clearSignupSession() {
  sessionStorage.removeItem(KEYS.orgId);
  sessionStorage.removeItem(KEYS.orgCode);
  sessionStorage.removeItem(KEYS.token);
  sessionStorage.removeItem(KEYS.preselectPlan);
}
