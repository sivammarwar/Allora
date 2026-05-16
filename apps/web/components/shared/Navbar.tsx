"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useCurrentUser, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "./NotificationBell";

export function Navbar({ title }: { title?: string }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 bg-brand-surface/80 backdrop-blur border-b border-brand-border">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-xl text-brand-text">Bharat Services</span>
          {title && (
            <span className="hidden sm:inline text-brand-textMuted">·</span>
          )}
          {title && (
            <span className="hidden sm:inline text-sm text-brand-textMuted">
              {title}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:inline-flex font-mono text-[10px] uppercase tracking-widest text-brand-primary px-2 py-1 rounded-sm border border-brand-border">
                {user.role.replace("_", " ")}
              </span>
              <NotificationBell />
              <span className="hidden md:inline text-sm text-brand-text">
                {user.name ?? user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout.mutateAsync();
                  router.replace("/login");
                }}
                aria-label="Log out"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">
                Log in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
