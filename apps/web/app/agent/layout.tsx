"use client";

import { LayoutDashboard, ShieldCheck, Map, CreditCard, BadgeDollarSign, Truck, CalendarCheck } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/agent/dashboard",       label: "Home",      icon: LayoutDashboard },
  { href: "/agent/requests",        label: "Verify",    icon: ShieldCheck },
  { href: "/agent/bookings",        label: "Bookings",  icon: CalendarCheck },
  { href: "/agent/areas",           label: "Areas",     icon: Map },
  { href: "/agent/price-control",   label: "Prices",    icon: BadgeDollarSign },
];

const allLinks = [
  { href: "/agent/dashboard",       label: "Home",      icon: LayoutDashboard },
  { href: "/agent/requests",        label: "Verify",    icon: ShieldCheck },
  { href: "/agent/bookings",        label: "Bookings",  icon: CalendarCheck },
  { href: "/agent/areas",           label: "Areas",     icon: Map },
  { href: "/agent/price-control",   label: "Prices",    icon: BadgeDollarSign },
  { href: "/agent/category-config", label: "Transport",  icon: Truck },
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
