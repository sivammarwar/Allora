"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Tag, Package } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/item-catalog/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/item-catalog/categories", label: "Categories", icon: Tag },
  { href: "/item-catalog/items", label: "Items", icon: Package },
];

export default function ItemCatalogLayout({ children }: { children: React.ReactNode }) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="ITEM_CATALOG">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Item Catalog" />
          <div className="flex">
            <Sidebar title="Catalog" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
