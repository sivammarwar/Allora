"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface SidebarLink {
  href: string;
  label: string;
  icon?: LucideIcon;
}

export function Sidebar({
  links,
  title,
}: {
  links: SidebarLink[];
  title?: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 border-r border-brand-border bg-brand-surface/60 backdrop-blur min-h-[calc(100vh-4rem)] sticky top-16">
      <nav className="flex-1 p-4 space-y-1">
        {title && (
          <p className="px-3 mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-textMuted">
            {title}
          </p>
        )}
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors",
                active
                  ? "bg-brand-primary/10 text-brand-primary font-medium"
                  : "text-brand-text hover:bg-[rgba(192,98,106,0.06)]"
              )}
            >
              {Icon && <Icon size={16} />}
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
