"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { RoleGate } from "@/components/shared/RoleGate";
import { type Role } from "@/lib/types";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardShellProps {
  role: Role;
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  links: NavLink[];
  /** Up to 5 links to pin in the bottom bar (defaults to first 5) */
  bottomLinks?: NavLink[];
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function TopHeader({
  title,
  subtitle,
  Icon,
  headerRight,
}: Pick<DashboardShellProps, "title" | "subtitle" | "Icon" | "headerRight">) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 px-4 h-14">
        {/* Role icon */}
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 bg-brand-primary/10">
          <Icon size={18} className="text-brand-primary" />
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium leading-none mb-0.5 text-gray-400">
            {greeting()} 👋
          </p>
          <h1 className="text-[15px] font-bold text-gray-900 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-gray-400 leading-none mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        {/* Right slot */}
        {headerRight && (
          <div className="flex items-center gap-2 flex-shrink-0">{headerRight}</div>
        )}
      </div>
    </header>
  );
}

function BottomNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname() ?? "";
  // Limit to 5 tabs — if more, show first 5
  const tabs = links.slice(0, 5);

  // Most-specific match: longest matching href wins (prevents /dashboard matching /dashboard/bookings)
  const activeHref = [...tabs]
    .sort((a, b) => b.href.length - a.href.length)
    .find((t) => pathname === t.href || pathname.startsWith(t.href + "/"))?.href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg safe-area-pb">
      <div className="flex items-end justify-around px-2 py-1">
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 relative transition-colors px-3 py-2 flex-1"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-primary" />
              )}
              <div className="relative">
                <Icon
                  size={20}
                  className={active ? "text-brand-primary" : "text-gray-400"}
                />
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium leading-none whitespace-nowrap ${
                  active ? "text-brand-primary" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardShell({
  role,
  title,
  subtitle,
  Icon,
  links,
  bottomLinks,
  headerRight,
  children,
}: DashboardShellProps) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname.endsWith("/login");
  const navTabs = bottomLinks ?? links;

  return (
    <RoleGate role={role}>
      {isLogin ? (
        children
      ) : (
        <>
          <TopHeader
            title={title}
            subtitle={subtitle}
            Icon={Icon}
            headerRight={headerRight}
          />
          <main className="pt-14 pb-20 min-h-screen bg-gray-50">
            <div className="px-4 sm:px-6 lg:px-8 py-5 w-full">{children}</div>
          </main>
          <BottomNav links={navTabs} />
        </>
      )}
    </RoleGate>
  );
}
