"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Coins } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/pay/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pay/records", label: "Daily records", icon: Receipt },
  { href: "/pay/earnings", label: "Earnings", icon: Coins },
];

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="PAYMENT_MANAGER">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Payments" />
          <div className="flex">
            <Sidebar title="Treasury" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
