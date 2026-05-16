"use client";

import { LayoutDashboard, FolderTree, Tag, Package, MessageSquare } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/pm/dashboard",              label: "Home",     icon: LayoutDashboard },
  { href: "/pm/categories",             label: "Categ.",   icon: FolderTree },
  { href: "/pm/subcategories",          label: "Subcat.",  icon: Tag },
  { href: "/pm/products",               label: "Products", icon: Package },
  { href: "/pm/contact-submissions",    label: "Messages", icon: MessageSquare },
];

export default function PMLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="PRODUCT_MANAGER"
      title="Product Manager"
      subtitle="Manage catalog & content"
      Icon={FolderTree}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
