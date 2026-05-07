"use client";

import Link from "next/link";
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

function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-brand-border shadow-lg">
      <div className="flex items-end justify-around px-2 py-1">
        {links.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 px-4 py-2">
              <Icon size={20} className={active ? "text-brand-primary" : "text-gray-400"} />
              <span className={`text-[10px] font-medium leading-none ${active ? "text-brand-primary" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">{children}</main>
          </div>
          <MobileBottomNav />
        </>
      )}
    </RoleGate>
  );
}
