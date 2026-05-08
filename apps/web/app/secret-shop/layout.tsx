"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Home, ShoppingBag, ShoppingCart, CreditCard, User, Search, X, Store } from "lucide-react";
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
    { href: "/secret-shop/cart", label: "Cart", icon: ShoppingCart },
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
              className="flex flex-col items-center gap-0.5 relative transition-colors px-3 py-2"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-primary" />
              )}
              <div className="relative">
                <Icon
                  size={20}
                  className={active ? "text-brand-primary" : "text-gray-400"}
                />
                {tab.href === "/secret-shop/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? "text-brand-primary" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ShopHeader({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const { items: cartItems } = useSecretCart();
  const cartCount = cartItems.reduce((s, x) => s + x.quantity, 0);
  const { data: me } = useQuery<{ state: string; profile?: { shopName: string } }>({
    queryKey: ["secret-shop", "me"],
    queryFn: () => api.get("/api/secret-shop/me"),
  });

  const shopName = me?.profile?.shopName ?? "My Shop";
  const isVerified = me?.state === "verified";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">

      {showSearch ? (
        /* ── Search mode ── */
        <div className="relative flex items-center gap-2 px-4 h-16">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, categories…"
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-gray-100 border border-gray-200"
            />
          </div>
          <button
            onClick={() => { setShowSearch(false); setSearch(""); }}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={17} className="text-gray-500" />
          </button>
        </div>
      ) : (
        /* ── Default mode ── */
        <div className="relative flex items-center gap-3 px-4 h-16">
          {/* Store icon */}
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-brand-primary/10">
            <Store size={20} className="text-brand-primary" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium leading-none mb-0.5 text-gray-400">
              {greeting()} 👋
            </p>
            <h1 className="text-[15px] font-bold text-gray-900 leading-tight truncate flex items-center gap-1.5">
              {shopName}
              {isVerified && (
                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-green-50 text-green-600">
                  ✓ Verified
                </span>
              )}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center"
            >
              <Search size={17} className="text-gray-500" />
            </button>
            <Link
              href="/secret-shop/cart"
              className="relative w-9 h-9 rounded-2xl bg-brand-primary/10 flex items-center justify-center"
            >
              <ShoppingCart size={17} className="text-brand-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] px-1 h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border-2 border-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}

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
          <main className="pt-16 pb-20 min-h-screen bg-gray-50">
            {children}
          </main>
          <BottomNav />
        </SecretShopGuard>
      </SecretShopSearchContext.Provider>
    </RoleGate>
  );
}
