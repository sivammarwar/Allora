import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "secret_shop_cart";

export interface CartItem {
  inventoryItemId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (item: Omit<CartItem, "quantity">) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

async function persist(items: CartItem[]) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
}

export const useSecretCart = create<CartStore>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(CART_KEY);
      const items: CartItem[] = raw ? JSON.parse(raw) : [];
      set({ items, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  add: (item) => {
    set((s) => {
      const existing = s.items.find((i) => i.inventoryItemId === item.inventoryItemId);
      const items = existing
        ? s.items.map((i) =>
            i.inventoryItemId === item.inventoryItemId ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...s.items, { ...item, quantity: 1 }];
      persist(items);
      return { items };
    });
  },

  inc: (id) => {
    set((s) => {
      const items = s.items.map((i) =>
        i.inventoryItemId === id ? { ...i, quantity: i.quantity + 1 } : i
      );
      persist(items);
      return { items };
    });
  },

  dec: (id) => {
    set((s) => {
      const items = s.items
        .map((i) => (i.inventoryItemId === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      persist(items);
      return { items };
    });
  },

  remove: (id) => {
    set((s) => {
      const items = s.items.filter((i) => i.inventoryItemId !== id);
      persist(items);
      return { items };
    });
  },

  clear: () => {
    AsyncStorage.removeItem(CART_KEY);
    set({ items: [] });
  },

  total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  count: () => get().items.reduce((s, i) => s + i.quantity, 0),
}));
