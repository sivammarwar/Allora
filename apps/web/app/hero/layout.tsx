"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ShoppingBag, CalendarClock, Bell, IndianRupee } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/hero/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hero/store", label: "My store", icon: Store },
  { href: "/hero/orders", label: "Orders", icon: ShoppingBag },
  { href: "/hero/slots", label: "My Slots", icon: CalendarClock },
  { href: "/hero/requests", label: "Requests", icon: Bell },
  { href: "/hero/earnings", label: "Earnings", icon: IndianRupee },
];

export default function HeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="HERO">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Hero" />
          <div className="flex">
            <Sidebar title="Service" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
