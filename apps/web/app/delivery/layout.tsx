"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Truck } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/delivery/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/delivery/orders", label: "Active orders", icon: Truck },
];

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="DELIVERY_BOY">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Delivery" />
          <div className="flex">
            <Sidebar title="Deliveries" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
