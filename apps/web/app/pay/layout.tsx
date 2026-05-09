"use client";

import { LayoutDashboard, Receipt, Coins } from "lucide-react";
import { DashboardShell } from "@/components/shared/DashboardShell";

const links = [
  { href: "/pay/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pay/records",   label: "Records",  icon: Receipt },
  { href: "/pay/earnings",  label: "Earnings", icon: Coins },
];

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="PAYMENT_MANAGER"
      title="Payment Manager"
      subtitle="Treasury & daily records"
      Icon={Coins}
      links={links}
    >
      {children}
    </DashboardShell>
  );
}
