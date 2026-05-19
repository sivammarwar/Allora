import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { disconnectAll } from "../lib/socket";
import { registerFCMToken } from "../lib/notifications";

export type Role =
  | "USER" | "HERO" | "AGENT" | "DELIVERY_BOY"
  | "ADMIN" | "PAYMENT_MANAGER" | "PRODUCT_MANAGER"
  | "SECRET_SHOP" | "ITEM_CATALOG";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  avatarUrl: string | null;
}

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  signInWithOTP: (email: string, role?: string, forceOtp?: boolean) => Promise<{ hasPassword: boolean }>;
  verifyOTP: (email: string, otp: string) => Promise<CurrentUser>;
  loginWithPassword: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await storage.get("access_token");
        if (token) {
          const me = await api.get("/api/auth/me") as any;
          setUser(me?.user ?? me);
        }
      } catch (err: any) {
        // Only clear tokens on 401 (invalid/expired token).
        // Network errors (server unreachable) should NOT log the user out —
        // their session is still valid, the server is just temporarily down.
        const status = err?.status ?? err?.response?.status ?? err?.statusCode;
        if (status === 401) {
          await storage.remove("access_token");
          await storage.remove("refresh_token");
        }
        // For network errors: keep tokens, user will retry on next launch.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInWithOTP = async (email: string, role?: string, forceOtp?: boolean): Promise<{ hasPassword: boolean }> => {
    const res = await api.post("/api/auth/send-otp", { email, ...(role ? { role } : {}), ...(forceOtp ? { forceOtp: true } : {}) }) as any;
    return { hasPassword: !!(res?.hasPassword) };
  };

  const loginWithPassword = async (email: string, password: string): Promise<CurrentUser> => {
    const res = await api.post("/api/auth/login-password", { email, password }) as any;
    await storage.set("access_token", res.accessToken);
    if (res.refreshToken) await storage.set("refresh_token", res.refreshToken);
    const me = await api.get("/api/auth/me") as unknown as { user: CurrentUser };
    const currentUser = (me as any).user ?? me;
    setUser(currentUser);
    registerFCMToken().catch(() => {}); // Non-fatal
    return currentUser;
  };

  const verifyOTP = async (email: string, otp: string): Promise<CurrentUser> => {
    const res = await api.post("/api/auth/verify-otp", { email, otp }) as any;
    await storage.set("access_token", res.accessToken);
    if (res.refreshToken) await storage.set("refresh_token", res.refreshToken);
    const me = await api.get("/api/auth/me") as any;
    const currentUser = me?.user ?? me;
    setUser(currentUser);
    registerFCMToken().catch(() => {}); // Non-fatal
    return currentUser;
  };

  const logout = async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    disconnectAll();
    await storage.remove("access_token");
    await storage.remove("refresh_token");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await api.get("/api/auth/me") as any;
      setUser(me?.user ?? me);
    } catch { setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithOTP, verifyOTP, loginWithPassword, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
