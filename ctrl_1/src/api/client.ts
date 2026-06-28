function getApiBase(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env) return env;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://localhost:4000";
  return `http://${h}:4000`;
}
const BASE = getApiBase();

export function getAdminToken(): string | null {
  return localStorage.getItem("kliq_admin_token");
}

export function setAdminToken(t: string) {
  localStorage.setItem("kliq_admin_token", t);
}

export function clearAdminToken() {
  localStorage.removeItem("kliq_admin_token");
  localStorage.removeItem("kliq_admin_user");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  return `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return "/avatar-default.svg";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("/")) return url;
  return `${BASE}/${url}`;
}

export const adminApi = {
  get:    <T>(path: string)               => request<T>("GET",    path),
  post:   <T>(path: string, body?: unknown) => request<T>("POST",   path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>("PATCH",  path, body),
  delete: <T>(path: string)               => request<T>("DELETE", path),
};
