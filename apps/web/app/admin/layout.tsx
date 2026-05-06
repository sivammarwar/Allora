"use client";

import { usePathname } from "next/navigation";
import { Map, Users, Settings, LayoutDashboard, Sparkles } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/viral", label: "Viral Section", icon: Sparkles },
  { href: "/admin/areas", label: "Areas", icon: Map },
  { href: "/admin/agents", label: "Agents", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname.endsWith("/login");
  return (
    <RoleGate role="ADMIN">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Admin" />
          <div className="flex">
            <Sidebar title="Administration" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
