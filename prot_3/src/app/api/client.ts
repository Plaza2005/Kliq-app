function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env) return env;
  // In dev, use relative paths so Vite's HTTPS proxy forwards them to the backend.
  // This avoids mixed-content blocks when the phone accesses over https://LAN-IP:5173.
  if (import.meta.env.DEV) return "";
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:4000";
  return `http://${h}:4000`;
}
export const BASE = getApiBase();

export function getWsUrl(): string {
  if (!BASE) {
    // Relative WS URL — browser resolves it against current page's wss:// or ws:// origin.
    return "/ws";
  }
  return BASE.replace(/^http/, "ws") + "/ws";
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE}${url}`;
}

export function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return "/avatar-default.svg";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("/")) return url;
  return `${BASE}/${url}`;
}

function getToken(): string | null {
  return localStorage.getItem("kliq_token");
}

export function setToken(t: string) {
  localStorage.setItem("kliq_token", t);
}

export function clearToken() {
  localStorage.removeItem("kliq_token");
  localStorage.removeItem("kliq_user");
}

// Fired when any request returns 401 — AuthContext listens and clears user state
export const AUTH_EXPIRED_EVENT = "kliq:auth-expired";

function handle401() {
  clearToken();
  // Only dispatch if not already on login page (prevents double-dispatch)
  if (!window.location.pathname.startsWith("/login")) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    handle401();
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }

  return data as T;
}

export const api = {
  get:    <T>(path: string, auth = true)                => request<T>("GET",    path, undefined, auth),
  post:   <T>(path: string, body?: unknown, auth = true) => request<T>("POST",   path, body, auth),
  patch:  <T>(path: string, body?: unknown, auth = true) => request<T>("PATCH",  path, body, auth),
  delete: <T>(path: string, auth = true)                => request<T>("DELETE", path, undefined, auth),

  upload: async (file: File): Promise<{ url: string }> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 401) { handle401(); throw new Error("Unauthorized"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    return data as { url: string };
  },
};
