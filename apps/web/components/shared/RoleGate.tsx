"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth";
import { roleLogin, roleHome, type Role } from "@/lib/types";

/**
 * Client-side gate: redirects to the role's login if the user is unauthenticated
 * or has the wrong role. Renders children only when the user is authenticated
 * with the expected role.
 *
 * Login routes (`/<role>/login`) are exempt from gating — they are the redirect
 * target itself, so applying the gate would cause a loop / blank page when an
 * unauthenticated visitor lands on them.
 */
export function RoleGate({
  role,
  children,
  guestOk = false,
}: {
  role: Role;
  children: React.ReactNode;
  /** When true, unauthenticated visitors can view — no redirect to login. */
  guestOk?: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = usePathname() ?? "";
  const isPublicAuthRoute = pathname.endsWith("/login");

  const { data: user, isLoading, isFetching } = useCurrentUser();

  useEffect(() => {
    if (isPublicAuthRoute) return;
    if (isLoading) return;
    // Guest-ok: only redirect if there IS a user but with the wrong role
    if (guestOk) {
      if (user && user.role !== role) {
        router.replace(roleHome[user.role]);
      }
      return;
    }
    if (!user) {
      router.replace(roleLogin[role]);
      return;
    }
    if (user.role !== role) {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace(roleLogin[user.role]);
    }
  }, [user, isLoading, role, router, isPublicAuthRoute, qc, guestOk]);

  if (isPublicAuthRoute) return <>{children}</>;

  // Guest-ok routes (e.g. user dashboard): never block on auth loading.
  // The useEffect above handles role-mismatch redirects once auth resolves.
  if (guestOk) return <>{children}</>;

  if (isLoading && user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== role) return null;
  return <>{children}</>;
}
