"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SecretCartItem {
  inventoryItemId: string;
  name: string;
  brandName: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  availableQty: number;
}

interface SecretCartState {
  items: SecretCartItem[];
  add: (item: Omit<SecretCartItem, "quantity">) => void;
  inc: (inventoryItemId: string) => void;
  dec: (inventoryItemId: string) => void;
  remove: (inventoryItemId: string) => void;
  clear: () => void;
  total: () => number;
}

export const useSecretCart = create<SecretCartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((x) => x.inventoryItemId === item.inventoryItemId);
          if (existing) {
            return {
              items: s.items.map((x) =>
                x.inventoryItemId === item.inventoryItemId ? { ...x, quantity: x.quantity + 1 } : x
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: 1 }] };
        }),
      inc: (inventoryItemId) =>
        set((s) => ({
          items: s.items.map((x) =>
            x.inventoryItemId === inventoryItemId && x.quantity < x.availableQty
              ? { ...x, quantity: x.quantity + 1 }
              : x
          ),
        })),
      dec: (inventoryItemId) =>
        set((s) => ({
          items: s.items
            .map((x) => (x.inventoryItemId === inventoryItemId ? { ...x, quantity: x.quantity - 1 } : x))
            .filter((x) => x.quantity > 0),
        })),
      remove: (inventoryItemId) =>
        set((s) => ({ items: s.items.filter((x) => x.inventoryItemId !== inventoryItemId) })),
      clear: () => set({ items: [] }),
      total: () =>
        get().items.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0),
    }),
    { name: "bharat-secret-cart-v2" }
  )
);
