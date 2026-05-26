"use client";

import { Home, CalendarClock, User } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";
import { UserHeaderActions } from "@/components/shared/UserHeaderActions";
import { GlobalRatingPrompt } from "@/components/shared/GlobalRatingPrompt";
import { DashboardFooter } from "@/components/shared/DashboardFooter";
import { TermsModal } from "@/components/shared/TermsModal";
import { useLanguage } from "@/lib/i18n";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  const links = [
    { href: "/dashboard",          label: t("nav.home"),     icon: Home },
    { href: "/dashboard/bookings", label: t("nav.bookings"), icon: CalendarClock, requiresAuth: true },
    { href: "/dashboard/profile",  label: t("nav.profile"),  icon: User,          requiresAuth: true },
  ];

  return (
    <DashboardShell
      role="USER"
      title={t("shell.userTitle")}
      subtitle={t("shell.userSubtitle")}
      Icon={Home}
      links={links}
      headerRight={<UserHeaderActions />}
    >
      {children}
      <GlobalRatingPrompt />
      <DashboardFooter />
      <TermsModal />
    </DashboardShell>
  );
}
