"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Clock, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/secret-shop/dashboard", label: "Allora", icon: LayoutDashboard },
  { href: "/secret-shop/orders", label: "Orders", icon: ShoppingBag },
  { href: "/secret-shop/past-orders", label: "Past Orders", icon: Clock },
  { href: "/secret-shop/cart", label: "Cart", icon: ShoppingCart },
];

export default function SecretShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="SECRET_SHOP">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Secret Shop" />
          <div className="flex">
            <Sidebar title="My Shop" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
