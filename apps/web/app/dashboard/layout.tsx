"use client";

import { Home, CalendarClock, User } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { UserHeaderActions } from "@/components/shared/UserHeaderActions";
import { GlobalRatingPrompt } from "@/components/shared/GlobalRatingPrompt";
import { DashboardFooter } from "@/components/shared/DashboardFooter";

const links = [
  { href: "/dashboard",          label: "Home",     icon: Home },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarClock, requiresAuth: true },
  { href: "/dashboard/profile",  label: "Profile",  icon: User,          requiresAuth: true },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="USER"
      title="Allora"
      subtitle="Shop & book services near you"
      Icon={Home}
      links={links}
      headerRight={<UserHeaderActions />}
    >
      {children}
      <GlobalRatingPrompt />
      <DashboardFooter />
    </DashboardShell>
  );
}
