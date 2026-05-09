"use client";

import { Home, ShoppingBag, CalendarClock, ShoppingCart, User } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { CartFloatingButton } from "@/components/shared/CartFloatingButton";

const links = [
  { href: "/dashboard",          label: "Home",     icon: Home },
  { href: "/orders",             label: "Orders",   icon: ShoppingBag },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock },
  { href: "/cart",               label: "Cart",     icon: ShoppingCart },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell
        role="USER"
        title="Allora"
        subtitle="Shop & book services near you"
        Icon={Home}
        links={links}
      >
        {children}
      </DashboardShell>
      <CartFloatingButton />
    </>
  );
}
