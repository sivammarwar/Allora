"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderTree,
  Tag,
  Package,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";

const links = [
  { href: "/pm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pm/categories", label: "Categories", icon: FolderTree },
  { href: "/pm/subcategories", label: "Subcategories", icon: Tag },
  { href: "/pm/products", label: "Products", icon: Package },
];

export default function PMLayout({ children }: { children: React.ReactNode }) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="PRODUCT_MANAGER">
      {isLogin ? (
        children
      ) : (
        <>
          <Navbar title="Product Manager" />
          <div className="flex">
            <Sidebar title="Catalog" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </>
      )}
    </RoleGate>
  );
}
