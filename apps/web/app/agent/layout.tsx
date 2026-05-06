"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Map, Package, Store, ClipboardList, Warehouse } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/requests", label: "Verification requests", icon: ShieldCheck },
  { href: "/agent/areas", label: "My areas", icon: Map },
  { href: "/agent/items", label: "Item Catalog", icon: Package },
  { href: "/agent/inventory", label: "My Inventory", icon: Warehouse },
  { href: "/agent/secret-shops", label: "Verify Secret Shops", icon: Store },
  { href: "/agent/secret-orders", label: "Verified Shops & Orders", icon: ClipboardList },
];

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="AGENT">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Agent" />
          <div className="flex">
            <Sidebar title="Workspace" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
