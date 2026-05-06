"use client";

import { Navbar } from "@/components/shared/Navbar";
import { RoleGate } from "@/components/shared/RoleGate";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="USER">
      <Navbar />
      <main className="container py-6">{children}</main>
    </RoleGate>
  );
}
