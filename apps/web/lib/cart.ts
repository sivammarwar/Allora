"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  /** Stable key used for de-dup (heroId + productId|subcategoryId) */
  key: string;
  heroId: string;
  heroLabel: string;
  /** Either productId OR subcategoryId is set. */
  productId?: string | null;
  subcategoryId?: string | null;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  /** Per-row delivery charge attributed to this hero (for products only). */
  deliveryCharge: number;
  quantity: number;
  /** "PRODUCT" or "SERVICE" (services are typically quantity-1 bookings). */
  type: "PRODUCT" | "SERVICE";
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  totals: () => { subtotal: number; delivery: number; total: number };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const key = `${item.heroId}:${item.productId ?? item.subcategoryId ?? "?"}`;
          const existing = s.items.find((x) => x.key === key);
          if (existing) {
            return {
              items: s.items.map((x) =>
                x.key === key ? { ...x, quantity: x.quantity + item.quantity } : x
              ),
            };
          }
          return { items: [...s.items, { ...item, key }] };
        }),
      inc: (key) =>
        set((s) => ({
          items: s.items.map((x) =>
            x.key === key ? { ...x, quantity: x.quantity + 1 } : x
          ),
        })),
      dec: (key) =>
        set((s) => ({
          items: s.items
            .map((x) =>
              x.key === key ? { ...x, quantity: x.quantity - 1 } : x
            )
            .filter((x) => x.quantity > 0),
        })),
      remove: (key) =>
        set((s) => ({ items: s.items.filter((x) => x.key !== key) })),
      clear: () => set({ items: [] }),
      totals: () => {
        const items = get().items;
        const subtotal = items.reduce(
          (n, x) => n + x.unitPrice * x.quantity,
          0
        );
        // Delivery charge is summed per unique hero row (not per quantity)
        const seen = new Set<string>();
        let delivery = 0;
        for (const i of items) {
          if (seen.has(i.heroId)) continue;
          seen.add(i.heroId);
          delivery += i.deliveryCharge;
        }
        return { subtotal, delivery, total: subtotal + delivery };
      },
    }),
    { name: "allora-cart" }
  )
);
