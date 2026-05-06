"use client";

import { Navbar } from "@/components/shared/Navbar";
import { RoleGate } from "@/components/shared/RoleGate";
import { CartFloatingButton } from "@/components/shared/CartFloatingButton";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate role="USER">
      <Navbar />
      <main className="container py-6">{children}</main>
      <CartFloatingButton />
    </RoleGate>
  );
}
