"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingBag, Clock, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { RoleGate } from "@/components/shared/RoleGate";
import { api } from "@/lib/api";

const links = [
  { href: "/secret-shop/dashboard", label: "Allora", icon: LayoutDashboard },
  { href: "/secret-shop/orders", label: "Orders", icon: ShoppingBag },
  { href: "/secret-shop/past-orders", label: "Past Orders", icon: Clock },
  { href: "/secret-shop/cart", label: "Cart", icon: ShoppingCart },
];

const PROTECTED = ["/secret-shop/orders", "/secret-shop/past-orders", "/secret-shop/cart"];

function SecretShopGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { data: me } = useQuery<{ state: string }>({
    queryKey: ["secret-shop", "me"],
    queryFn: () => api.get("/api/secret-shop/me"),
  });

  useEffect(() => {
    if (me && me.state !== "verified" && PROTECTED.some((p) => pathname.startsWith(p))) {
      router.replace("/secret-shop/dashboard");
    }
  }, [me, pathname, router]);

  return <>{children}</>;
}

export default function SecretShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLogin = (usePathname() ?? "").endsWith("/login");
  return (
    <RoleGate role="SECRET_SHOP">
      {isLogin ? (
        children
      ) : (
        <SecretShopGuard>
          <Navbar title="Secret Shop" />
          <div className="flex">
            <Sidebar title="My Shop" links={links} />
            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
          </div>
        </SecretShopGuard>
      )}
    </RoleGate>
  );
}
