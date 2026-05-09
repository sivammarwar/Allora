"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Map, Store, ClipboardList, Warehouse, CreditCard, BadgeDollarSign } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/requests", label: "Verification requests", icon: ShieldCheck },
  { href: "/agent/areas", label: "My areas", icon: Map },
  { href: "/agent/inventory", label: "My Inventory", icon: Warehouse },
  { href: "/agent/secret-shops", label: "Verify Secret Shops", icon: Store },
  { href: "/agent/secret-orders", label: "Verified Shops & Orders", icon: ClipboardList },
  { href: "/agent/price-control", label: "Price Control", icon: BadgeDollarSign },
  { href: "/agent/payment-history", label: "Payment History", icon: CreditCard },
];

const mobileNav = [
  { href: "/agent/dashboard",       label: "Home",      icon: LayoutDashboard },
  { href: "/agent/requests",        label: "Requests",  icon: ShieldCheck },
  { href: "/agent/areas",           label: "Areas",     icon: Map },
  { href: "/agent/inventory",       label: "Inventory", icon: Warehouse },
  { href: "/agent/secret-shops",    label: "Shops",     icon: Store },
  { href: "/agent/secret-orders",   label: "Orders",    icon: ClipboardList },
  { href: "/agent/price-control",   label: "Prices",    icon: BadgeDollarSign },
  { href: "/agent/payment-history", label: "Payments",  icon: CreditCard },
];

function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-brand-border shadow-lg">
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex items-end px-1 py-1 w-max min-w-full justify-around">
          {mobileNav.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 flex-shrink-0 relative ${active ? "" : ""}`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-primary" />
                )}
                <Icon size={20} className={active ? "text-brand-primary" : "text-gray-400"} />
                <span className={`text-[9px] font-semibold leading-none whitespace-nowrap ${active ? "text-brand-primary" : "text-gray-400"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="AGENT">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Regional Officer" />
          <div className="flex">
            <Sidebar title="Workspace" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">{children}</main>
          </div>
          <MobileBottomNav />
        </>
      )}
    </RoleGate>
  );
}
