import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, setToken, clearToken, AUTH_EXPIRED_EVENT } from "../api/client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string | null;
  phone: string | null;
  tier: string;
  isVerified: boolean;
  isAdmin: boolean;
  isOnboarded?: boolean;
  status: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  notifPrefs: string | null;
  privacySettings: string | null;
}

interface AuthContextType {
  user:  AuthUser | null;
  token: string | null;
  loading: boolean;
  login:    (identifier: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, username: string, phone?: string) => Promise<void>;
  logout:   () => void;
  updateUser: (data: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("kliq_token"));
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem("kliq_user");
    const token  = localStorage.getItem("kliq_token");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    // Re-validate token silently
    if (token) {
      api.get<AuthUser>("/auth/me")
        .then(u => {
          setUser(u);
          localStorage.setItem("kliq_user", JSON.stringify(u));
          if (!u.isOnboarded && !localStorage.getItem("kliq_onboarded")
            && window.location.pathname !== "/onboarding") {
            window.location.replace("/onboarding");
          }
        })
        .catch(() => { clearToken(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", { identifier, password }, false);
    setToken(res.token);
    setTokenState(res.token);
    localStorage.setItem("kliq_user", JSON.stringify(res.user));
    setUser(res.user);
    if (!res.user.isOnboarded && !localStorage.getItem("kliq_onboarded")) {
      window.location.replace("/onboarding");
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string, username: string, phone?: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/register", { email, password, displayName, username, ...(phone ? { phone } : {}) }, false);
    setToken(res.token);
    setTokenState(res.token);
    localStorage.setItem("kliq_user", JSON.stringify(res.user));
    setUser(res.user);
    if (!res.user.isOnboarded && !localStorage.getItem("kliq_onboarded")) {
      window.location.replace("/onboarding");
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("kliq_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await api.get<AuthUser>("/auth/me");
    setUser(u);
    localStorage.setItem("kliq_user", JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};
