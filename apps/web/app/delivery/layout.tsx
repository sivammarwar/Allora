"use client";

import { LayoutDashboard, Truck } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/delivery/dashboard", label: "Home",   icon: LayoutDashboard },
  { href: "/delivery/orders",    label: "Orders", icon: Truck },
];

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="DELIVERY_BOY"
      title="Delivery"
      subtitle="Your active deliveries"
      Icon={Truck}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
