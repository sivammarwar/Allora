"use client";

import { LayoutDashboard, Store, CalendarClock, Bell, IndianRupee, UserCircle } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { useLanguage } from "@/lib/i18n";

export default function HeroLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  const links = [
    { href: "/hero/dashboard", label: t("nav.home"),     icon: LayoutDashboard },
    { href: "/hero/slots",     label: t("nav.slots"),    icon: CalendarClock },
    { href: "/hero/requests",  label: t("nav.requests"), icon: Bell },
    { href: "/hero/earnings",  label: t("nav.earnings"), icon: IndianRupee },
    { href: "/hero/profile",   label: t("nav.profile"),  icon: UserCircle },
  ];

  return (
    <DashboardShell
      role="HERO"
      title={t("shell.heroTitle")}
      subtitle={t("shell.heroSubtitle")}
      Icon={Store}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
