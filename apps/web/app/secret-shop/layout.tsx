"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Home, ShoppingBag, ShoppingCart, CreditCard, User, Search, X } from "lucide-react";
import { RoleGate } from "@/components/shared/RoleGate";
import { api } from "@/lib/api";
import { useSecretCart } from "@/lib/secretShopCart";
import Link from "next/link";

// ─── Search context shared between header and dashboard ──────────────────────
export const SecretShopSearchContext = createContext<{
  search: string;
  setSearch: (s: string) => void;
}>({ search: "", setSearch: () => {} });

export function useSecretShopSearch() { return useContext(SecretShopSearchContext); }

const PROTECTED = ["/secret-shop/orders", "/secret-shop/past-orders", "/secret-shop/cart", "/secret-shop/payment-history", "/secret-shop/profile"];

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

function BottomNav() {
  const pathname = usePathname() ?? "";
  const { items: cartItems } = useSecretCart();
  const cartCount = cartItems.reduce((s, x) => s + x.quantity, 0);

  const tabs = [
    { href: "/secret-shop/dashboard", label: "Home", icon: Home },
    { href: "/secret-shop/orders", label: "Orders", icon: ShoppingBag },
    { href: "/secret-shop/cart", label: "Cart", icon: ShoppingCart, highlight: true },
    { href: "/secret-shop/payment-history", label: "Payments", icon: CreditCard },
    { href: "/secret-shop/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg safe-area-pb">
      <div className="flex items-end justify-around px-2 py-1">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 relative transition-colors ${
                tab.highlight
                  ? "bg-brand-primary rounded-2xl px-5 py-2.5 -mt-4 shadow-lg shadow-brand-primary/30"
                  : "px-3 py-2"
              }`}
            >
              <div className="relative">
                <Icon
                  size={tab.highlight ? 22 : 20}
                  className={
                    tab.highlight
                      ? "text-white"
                      : active
                      ? "text-brand-primary"
                      : "text-gray-400"
                  }
                />
                {tab.href === "/secret-shop/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium leading-none ${
                  tab.highlight ? "text-white" : active ? "text-brand-primary" : "text-gray-400"
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

function ShopHeader({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const { data: me } = useQuery<{ state: string; profile?: { shopName: string } }>({
    queryKey: ["secret-shop", "me"],
    queryFn: () => api.get("/api/secret-shop/me"),
  });

  const shopName = me?.profile?.shopName ?? "Allora";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 px-4 h-14">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands, categories…"
                className="w-full pl-9 pr-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <button onClick={() => { setShowSearch(false); setSearch(""); }} className="text-gray-500 p-1">
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 leading-none">Welcome</p>
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{shopName}</h1>
            </div>
            <button onClick={() => setShowSearch(true)} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-gray-100">
              <Search size={18} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default function SecretShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname.endsWith("/login");
  const [search, setSearch] = useState("");

  if (isLogin) {
    return <RoleGate role="SECRET_SHOP">{children}</RoleGate>;
  }

  return (
    <RoleGate role="SECRET_SHOP">
      <SecretShopSearchContext.Provider value={{ search, setSearch }}>
        <SecretShopGuard>
          <ShopHeader search={search} setSearch={setSearch} />
          <main className="pt-14 pb-20 min-h-screen bg-gray-50">
            {children}
          </main>
          <BottomNav />
        </SecretShopGuard>
      </SecretShopSearchContext.Provider>
    </RoleGate>
  );
}
