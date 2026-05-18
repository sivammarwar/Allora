"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken } from "./api";
import type { AuthUser, Role } from "./types";

/** Fetches the current authenticated user, or null if unauthenticated. */
export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        const { user } = await api.get<{ user: AuthUser }>("/api/auth/me");
        return user;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (input: { email: string; role?: Role; forceOtp?: boolean }) =>
      api.post<{ ok: true; hasPassword: boolean }>("/api/auth/send-otp", input),
  });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; otp: string }) =>
      api.post<{ ok: true; accessToken?: string; user: AuthUser }>("/api/auth/verify-otp", input),
    onSuccess: ({ user, accessToken }) => {
      if (accessToken) setAccessToken(accessToken);
      qc.setQueryData(["auth", "me"], user);
    },
  });
}

export function useCheckPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.get<{ hasPassword: boolean }>(`/api/auth/check-password?email=${encodeURIComponent(email)}`),
  });
}

export function useLoginPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ ok: true; accessToken?: string; user: AuthUser }>("/api/auth/login-password", input),
    onSuccess: ({ user, accessToken }) => {
      if (accessToken) setAccessToken(accessToken);
      qc.setQueryData(["auth", "me"], user);
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (input: { password: string }) =>
      api.post<{ ok: true }>("/api/auth/set-password", input),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("/api/auth/logout"),
    onSuccess: () => {
      setAccessToken(null);
      qc.setQueryData(["auth", "me"], null);
      qc.clear();
    },
  });
}
