"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/auth";

const ALLOWED_EMAIL = "govindkkp+maininventory@gmail.com";

export default function MainInventoryLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const isLogin = pathname.endsWith("/login");

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isLogin) { router.replace("/main-inventory/login"); return; }
    if (user && user.role !== "ADMIN" && user.email !== ALLOWED_EMAIL && !isLogin) {
      router.replace("/main-inventory/login");
    }
    if (user && (user.role === "ADMIN" || user.email === ALLOWED_EMAIL) && isLogin) {
      router.replace("/main-inventory");
    }
  }, [user, isLoading, isLogin, router]);
  const authorized = user && (user.role === "ADMIN" || user.email === ALLOWED_EMAIL);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLogin && !authorized) return null;

  return <>{children}</>;
}
