import { API_BASE_URL, OAUTH_CLIENT_ID, clearTokens } from "@/lib/api";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  storePkceSession,
} from "@/lib/pkce";

/**
 * Initiates standard PKCE flow.
 * Clears old client tokens and redirects to Spring Authorization Server.
 */
export async function startLogin(redirectAfterLogin?: string) {
  // Clear any existing tokens from the previous user
  clearTokens();

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  storePkceSession(verifier, state);
  sessionStorage.setItem("mu_post_login_redirect", redirectAfterLogin ?? "/app");

  const redirectUri = `${window.location.origin}/oauth/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH_CLIENT_ID,
    scope: "openid profile",
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "login", // Tells authorization server to re-prompt credentials if supported
  });

  window.location.href = `${API_BASE_URL}/oauth2/authorize?${params.toString()}`;
}
