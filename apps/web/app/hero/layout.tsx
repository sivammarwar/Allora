"use client";

import { LayoutDashboard, Store, CalendarClock, Bell, IndianRupee, UserCircle } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/hero/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/hero/slots", label: "Slots", icon: CalendarClock },
  { href: "/hero/requests", label: "Requests", icon: Bell },
  { href: "/hero/earnings", label: "Earnings", icon: IndianRupee },
  { href: "/hero/profile", label: "Profile", icon: UserCircle },
];

export default function HeroLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="HERO"
      title="Hero Dashboard"
      subtitle="Manage your services & bookings"
      Icon={Store}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
