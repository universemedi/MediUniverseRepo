import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

/**
 * Single Axios boundary for all browser -> backend communication.
 * UI modules should use apiFetch/apiFetchPublic rather than fetch().
 */
export const API_BASE_URL: string =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/+$/, "") ??
  "http://localhost:8080";

export const OAUTH_CLIENT_ID = "mediunivers-web";

const ACCESS_TOKEN_KEY = "mu_access_token";
const REFRESH_TOKEN_KEY = "mu_refresh_token";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresIn?: number | undefined;
}

export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  fieldErrors?: string[] | Record<string, string> | ApiFieldError[];
  errors?: string[] | Record<string, string> | ApiFieldError[];
  timestamp?: string;
  path?: string;
}

export function saveTokens(tokens: TokenSet) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem("mu_pkce_verifier");
  sessionStorage.removeItem("mu_pkce_state");
  sessionStorage.removeItem("mu_post_login_redirect");
}

export class ApiError extends Error {
  status: number;
  fieldErrors: string[];
  details?: ApiErrorPayload | undefined;

  constructor(
    message: string,
    status: number,
    fieldErrors: string[] = [],
    details?: ApiErrorPayload,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}

function flattenFieldErrors(payload?: ApiErrorPayload): string[] {
  const source = payload?.fieldErrors ?? payload?.errors;
  if (!source) return [];

  if (Array.isArray(source)) {
    return source.map((item) =>
      typeof item === "string" ? item : `${item.field ? `${item.field}: ` : ""}${item.message}`,
    );
  }

  return Object.entries(source).map(([field, message]) => `${field}: ${message}`);
}

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(
      error instanceof Error ? error.message : "Unexpected application error",
      500,
    );
  }

  const axiosError = error as AxiosError<ApiErrorPayload>;
  const status = axiosError.response?.status ?? 0;
  const payload = axiosError.response?.data;
  const fieldErrors = flattenFieldErrors(payload);

  if (status === 0) {
    return new ApiError(
      "Unable to reach the server. Check your internet connection or try again.",
      0,
      fieldErrors,
      payload,
    );
  }

  if (status === 401) {
    return new ApiError(
      "Your session has expired. Please sign in again.",
      status,
      fieldErrors,
      payload,
    );
  }

  if (status === 403) {
    return new ApiError(
      "You do not have permission to perform this action.",
      status,
      fieldErrors,
      payload,
    );
  }

  if (status >= 500) {
    return new ApiError(
      payload?.message ?? "The server encountered an error. Please try again.",
      status,
      fieldErrors,
      payload,
    );
  }

  return new ApiError(
    payload?.message ?? payload?.error ?? axiosError.message ?? `Request failed (${status})`,
    status,
    fieldErrors,
    payload,
  );
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export async function apiFetch<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient.request<T>({
      url: path,
      ...config,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiFetchPublic<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient.request<T>({
      url: path,
      ...config,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers ?? {}),
      },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export const apiGet = <T>(path: string, config?: AxiosRequestConfig) =>
  apiFetch<T>(path, { ...config, method: "GET" });

export const apiPost = <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiFetch<T>(path, { ...config, method: "POST", data });

export const apiPut = <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiFetch<T>(path, { ...config, method: "PUT", data });

export const apiPatch = <T>(path: string, data?: unknown, config?: AxiosRequestConfig) =>
  apiFetch<T>(path, { ...config, method: "PATCH", data });

export const apiDelete = <T>(path: string, config?: AxiosRequestConfig) =>
  apiFetch<T>(path, { ...config, method: "DELETE" });

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post("/api/logout");
  } catch {
    // Logout must always clear local state even if the backend is unavailable.
  } finally {
    clearTokens();
    window.location.href = "/login";
  }
}
