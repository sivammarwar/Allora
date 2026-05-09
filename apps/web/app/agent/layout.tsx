"use client";

import { LayoutDashboard, ShieldCheck, Map, Store, ClipboardList, Warehouse, CreditCard, BadgeDollarSign, Clock } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/agent/dashboard",       label: "Home",      icon: LayoutDashboard },
  { href: "/agent/requests",        label: "Verify",    icon: ShieldCheck },
  { href: "/agent/areas",           label: "Areas",     icon: Map },
  { href: "/agent/inventory",       label: "Inventory", icon: Warehouse },
  { href: "/agent/price-control",   label: "Prices",    icon: BadgeDollarSign },
];

const allLinks = [
  { href: "/agent/dashboard",       label: "Home",      icon: LayoutDashboard },
  { href: "/agent/requests",        label: "Verify",    icon: ShieldCheck },
  { href: "/agent/areas",           label: "Areas",     icon: Map },
  { href: "/agent/inventory",       label: "Inventory", icon: Warehouse },
  { href: "/agent/secret-shops",    label: "Shops",     icon: Store },
  { href: "/agent/secret-orders",   label: "Orders",    icon: ClipboardList },
  { href: "/agent/price-control",   label: "Prices",    icon: BadgeDollarSign },
  { href: "/agent/slot-config",     label: "Slots",     icon: Clock },
  { href: "/agent/payment-history", label: "Payments",  icon: CreditCard },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="AGENT"
      title="Regional Officer"
      subtitle="Manage your area & heroes"
      Icon={ShieldCheck}
      links={allLinks}
      bottomLinks={links}
    >
      {children}
    </DashboardShell>
  );
}
