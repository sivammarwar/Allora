"use client";

import { Home, ShoppingBag, CalendarClock, ShoppingCart } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/dashboard",          label: "Home",     icon: Home },
  { href: "/orders",             label: "Orders",   icon: ShoppingBag },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/cart",               label: "Cart",     icon: ShoppingCart },
];

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="USER"
      title="My Cart"
      subtitle="Review & checkout"
      Icon={ShoppingCart}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
