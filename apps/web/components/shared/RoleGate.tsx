"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth";
import { roleLogin, type Role } from "@/lib/types";

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
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const pathname = usePathname() ?? "";
  // Treat any `/login` segment as a public auth route within this layout tree.
  const isPublicAuthRoute = pathname.endsWith("/login");

  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isPublicAuthRoute) return;
    if (isLoading) return;
    if (!user) {
      router.replace(roleLogin[role]);
      return;
    }
    if (user.role !== role) {
      // Force a fresh /me fetch before redirecting — catches stale-cache mismatches
      // where cookies belong to a different user than what's in the React Query cache.
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace(roleLogin[user.role]);
    }
  }, [user, isLoading, role, router, isPublicAuthRoute, qc]);

  if (isPublicAuthRoute) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== role) return null;
  return <>{children}</>;
}
