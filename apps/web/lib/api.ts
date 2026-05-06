/**
 * Tiny fetch wrapper that:
 *  - Targets NEXT_PUBLIC_API_URL
 *  - Always sends cookies (credentials: "include") for HTTP-only JWT
 *  - Auto-refreshes the access token on 401 once, then retries
 *  - Throws ApiError with status + message
 */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the auto-refresh + retry on 401 (used by /refresh itself). */
  skipRefresh?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return r.ok;
    } catch {
      return false;
    } finally {
      // small delay to coalesce bursts
      setTimeout(() => {
        refreshing = null;
      }, 50);
    }
  })();
  return refreshing;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const init: RequestInit = {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  let res = await fetch(url, init);

  if (res.status === 401 && !opts.skipRefresh && path !== "/api/auth/refresh") {
    const ok = await tryRefresh();
    if (ok) res = await fetch(url, init);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && (data as any)?.error) ||
      `Request failed: ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T,>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T,>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
