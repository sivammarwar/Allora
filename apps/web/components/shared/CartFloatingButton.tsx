"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/utils";

/** Floating bottom-right cart button shown on every user page. */
export function CartFloatingButton() {
  const items = useCart((s) => s.items);
  const totals = useCart((s) => s.totals);

  if (items.length === 0) return null;
  const t = totals();
  const count = items.reduce((n, x) => n + x.quantity, 0);

  return (
    <Link
      href="/cart"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-3 px-4 py-3 rounded-full bg-brand-primary text-white shadow-soft-lg hover:bg-brand-secondary transition-colors"
    >
      <ShoppingCart size={18} />
      <div className="flex flex-col leading-tight text-left">
        <span className="text-[11px] font-mono uppercase tracking-widest opacity-90">
          {count} item{count === 1 ? "" : "s"}
        </span>
        <span className="text-sm font-medium">{formatINR(t.total)}</span>
      </div>
    </Link>
  );
}
