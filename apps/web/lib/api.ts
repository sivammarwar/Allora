/**
 * Tiny fetch wrapper that:
 *  - Targets NEXT_PUBLIC_API_URL
 *  - Sends access token as Authorization Bearer header (stored in memory)
 *  - Also sends cookies (credentials: "include") as fallback for same-origin
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

// In-memory token store (survives re-renders, cleared on tab close)
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
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
      if (r.ok) {
        const data = await r.json().catch(() => null);
        if (data?.accessToken) setAccessToken(data.accessToken);
      }
      return r.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 50);
    }
  })();
  return refreshing;
}

function buildInit(opts: RequestOptions): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (_accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;
  return {
    ...opts,
    credentials: "include",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  let init = buildInit(opts);
  let res = await fetch(url, init);

  if (res.status === 401 && !opts.skipRefresh && path !== "/api/auth/refresh") {
    const ok = await tryRefresh();
    if (ok) {
      init = buildInit(opts);
      res = await fetch(url, init);
    }
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
