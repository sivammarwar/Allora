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
    <header className="fixed top-0 left-0 right-0 z-40" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)" }}>
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
        <div className="absolute top-2 left-1/2 w-16 h-16 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }} />
      </div>

      {showSearch ? (
        /* ── Search mode ── */
        <div className="relative flex items-center gap-2 px-4 h-16">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, categories…"
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm text-white placeholder-white/50 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}
            />
          </div>
          <button
            onClick={() => { setShowSearch(false); setSearch(""); }}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <X size={17} className="text-white" />
          </button>
        </div>
      ) : (
        /* ── Default mode ── */
        <div className="relative flex items-center gap-3 px-4 h-16">
          {/* Store icon */}
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.18)" }}>
            <Store size={20} className="text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium leading-none mb-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              {greeting()} 👋
            </p>
            <h1 className="text-[15px] font-bold text-white leading-tight truncate flex items-center gap-1.5">
              {shopName}
              {isVerified && (
                <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}>
                  ✓ Verified
                </span>
              )}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Search size={17} className="text-white" />
            </button>
            <Link
              href="/secret-shop/cart"
              className="relative w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <ShoppingCart size={17} className="text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border-2 border-transparent" style={{ borderColor: "#7c3aed" }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Bottom fade edge */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08), transparent)" }} />
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
