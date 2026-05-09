"use client";

import { Map, Users, Settings, LayoutDashboard, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/admin/areas", label: "Areas", icon: Map },
  { href: "/admin/agents", label: "Agents", icon: Users },
  { href: "/admin/viral", label: "Viral", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="ADMIN"
      title="Admin Panel"
      subtitle="System administration"
      Icon={LayoutDashboard}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
