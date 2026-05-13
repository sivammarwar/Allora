import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { storage } from "../lib/storage";
import { disconnectAll } from "../lib/socket";

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
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<CurrentUser>;
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
          const me = await api.get("/api/auth/me") as unknown as CurrentUser;
          setUser(me);
        }
      } catch {
        await storage.remove("access_token");
        await storage.remove("refresh_token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInWithOTP = async (email: string) => {
    await api.post("/api/auth/send-otp", { email });
  };

  const verifyOTP = async (email: string, otp: string): Promise<CurrentUser> => {
    const res = await api.post("/api/auth/verify-otp", { email, otp }) as any;
    await storage.set("access_token", res.accessToken);
    if (res.refreshToken) await storage.set("refresh_token", res.refreshToken);
    const me = await api.get("/api/auth/me") as unknown as CurrentUser;
    setUser(me);
    return me;
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
      const me = await api.get("/api/auth/me") as unknown as CurrentUser;
      setUser(me);
    } catch { setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithOTP, verifyOTP, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
